import "server-only"
import type * as Adk from "@google/adk"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ADAPTERS, adapterFor, type ContentType } from "@/lib/agent/registry"
import { AGENT_TYPES } from "@/lib/agent/schemas"
import type { ProposalCollector } from "@/lib/agent/proposals"

// ADK function tools for the admin assistant. Reads run immediately; every write tool only
// produces a proposal that the owner must confirm (see lib/agent/proposals.ts).

const LIST_LIMIT = 50
const isUuid = (value: unknown) => typeof value === "string" && z.uuid().safeParse(value).success

const typeParam = z.enum(AGENT_TYPES).describe(`Content type. One of: ${AGENT_TYPES.join(", ")}.`)

async function guarded<T> (label: string, run: () => Promise<T>) {
    try {
        return await run()
    } catch (error) {
        console.error(`[agent] tool ${label} failed:`, error instanceof Error ? error.message : error)
        return { status: "error", message: "Couldn't load that right now. Tell the owner to try again." }
    }
}

// `adk` is the lazily imported @google/adk module (see lib/agent/run.ts).
export function buildTools (adk: typeof Adk, supabase: SupabaseClient, collector: ProposalCollector) {
    type Tool = Adk.FunctionTool<z.ZodObject<z.ZodRawShape>>
    const tools: Tool[] = []

    tools.push(new adk.FunctionTool({
        name: "list_content",
        description: "List items of one content type with their ids (compact rows). Use before any update or delete to find the right id. For *_page and project_form it returns the page's current text.",
        parameters: z.object({
            type: typeParam,
            query: z.string().optional().describe("Optional case-insensitive text filter, e.g. a name or company."),
        }),
        execute: ({ type, query }) => guarded("list_content", async () => {
            const rows = await adapterFor(type).list(supabase)
            const needle = query?.trim().toLowerCase()
            const matches = needle ? rows.filter(row => JSON.stringify(row).toLowerCase().includes(needle)) : rows
            return { status: "ok", type, total: matches.length, items: matches.slice(0, LIST_LIMIT), truncated: matches.length > LIST_LIMIT }
        }),
    }) as unknown as Tool)

    tools.push(new adk.FunctionTool({
        name: "get_content",
        description: "Get the full current values of one item (or of a *_page / project_form page, without an id). Blog posts include body_markdown.",
        parameters: z.object({
            type: typeParam,
            id: z.string().optional().describe("Item id from list_content. Leave out for about_page, gallery_page, blog_page and project_form."),
        }),
        execute: ({ type, id }) => guarded("get_content", async () => {
            const adapter = adapterFor(type)
            if (!adapter.singleton && !isUuid(id)) return { status: "not_found", message: "Give a valid id from list_content." }
            const item = await adapter.view(supabase, adapter.singleton ? null : id as string)
            return item ? { status: "ok", type, item } : { status: "not_found", message: `${adapter.label} not found.` }
        }),
    }) as unknown as Tool)

    const deletable = AGENT_TYPES.filter(type => Boolean(adapterFor(type).remove)) as [ContentType, ...ContentType[]]
    tools.push(new adk.FunctionTool({
        name: "propose_delete",
        description: "Propose deleting one item. Shows the owner a confirmation card; nothing is deleted until they confirm.",
        parameters: z.object({
            type: z.enum(deletable).describe(`Content type: ${deletable.join(", ")}.`),
            id: z.string().describe("Item id from list_content."),
        }),
        execute: ({ type, id }) => guarded("propose_delete", async () => {
            if (!isUuid(id)) return { status: "not_found", message: "Give a valid id from list_content." }
            return collector.remove(type, id)
        }),
    }) as unknown as Tool)

    for (const [type, adapter] of Object.entries(ADAPTERS) as [ContentType, (typeof ADAPTERS)[ContentType]][]) {
        if (!adapter.fields) continue
        const label = adapter.label.toLowerCase()

        if (adapter.canCreate) {
            tools.push(new adk.FunctionTool({
                name: `propose_create_${type}`,
                description: `Propose creating a new ${label}. ${adapter.about} Shows the owner a confirmation card; nothing is saved until they confirm.`,
                parameters: adapter.fields,
                execute: changes => guarded(`propose_create_${type}`, () => collector.write(type, null, changes as Record<string, unknown>)),
            }))
        }

        const updateParams = adapter.singleton
            ? adapter.fields
            : adapter.fields.extend({ id: z.string().describe(`Id of the ${label} from list_content.`) })

        tools.push(new adk.FunctionTool({
            name: `propose_update_${type}`,
            description: `Propose changing ${adapter.singleton ? `the ${label}` : `an existing ${label}`}. ${adapter.about} Pass ONLY the fields that change. Shows the owner a confirmation card; nothing is saved until they confirm.`,
            parameters: updateParams,
            execute: input => guarded(`propose_update_${type}`, async () => {
                const { id, ...changes } = input as Record<string, unknown>
                if (adapter.singleton) return collector.write(type, null, changes)
                if (!isUuid(id)) return { status: "not_found", message: "Give a valid id from list_content." }
                return collector.write(type, id as string, changes)
            }),
        }))
    }

    return tools
}
