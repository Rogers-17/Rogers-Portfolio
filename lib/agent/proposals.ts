import "server-only"
import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { zodIssues } from "@/lib/admin/http"
import { failure, type ActionResult } from "@/lib/admin/actions/result"
import { adapterFor, CONTENT_TYPES, type ContentType } from "@/lib/agent/registry"
import { proposalSchema, type Proposal, type ProposalDiff } from "@/lib/agent/schemas"

export { proposalSchema, type Proposal }

// The assistant never writes. Write tools turn a requested change into a validated
// proposal; the owner confirms it in the UI, and only then executeProposal() runs it
// through the same admin actions the forms use.

export const MAX_PROPOSALS_PER_TURN = 5

type Row = Record<string, unknown>

export type ToolOutcome =
    | { status: "proposed", proposalId: string, summary: string, message: string }
    | { status: "invalid" | "not_found" | "no_change" | "limit", message: string, issues?: { path: string, message: string }[] }

const isEmpty = (value: unknown) => value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)

function format (value: unknown): string {
    if (isEmpty(value)) return "—"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (Array.isArray(value)) return value.map(item => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", ").slice(0, 300)
    if (typeof value === "object") return JSON.stringify(value).slice(0, 300)
    const text = String(value)
    return text.length > 300 ? `${text.slice(0, 299)}…` : text
}

const humanize = (key: string) => key.replace(/_/g, " ").replace(/^\w/, char => char.toUpperCase())

function buildDiff (before: Row, after: Row): ProposalDiff[] {
    const diff: ProposalDiff[] = []
    for (const [key, value] of Object.entries(after)) {
        if (value === undefined || key.endsWith("_path")) continue
        const previous = before[key]
        if (isEmpty(previous) && isEmpty(value)) continue
        if (JSON.stringify(previous ?? null) === JSON.stringify(value ?? null)) continue
        diff.push({ field: humanize(key), before: format(previous), after: format(value) })
    }
    return diff
}

function dropUndefined (row: Row): Row {
    return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))
}

export class ProposalCollector {
    readonly proposals: Proposal[] = []

    constructor (private readonly supabase: SupabaseClient) {}

    private add (proposal: Omit<Proposal, "id">): ToolOutcome {
        if (this.proposals.length >= MAX_PROPOSALS_PER_TURN) {
            return { status: "limit", message: `Already ${MAX_PROPOSALS_PER_TURN} changes waiting. Ask the owner to confirm those first.` }
        }
        const full = { ...proposal, id: randomUUID() }
        this.proposals.push(full)
        return { status: "proposed", proposalId: full.id, summary: full.summary, message: "Shown to the owner as a card. Nothing is saved until they click Confirm." }
    }

    // Create (id === null on a collection) or update (id set, or a singleton page).
    async write (type: ContentType, id: string | null, rawChanges: Row): Promise<ToolOutcome> {
        const adapter = adapterFor(type)
        const changes = dropUndefined(rawChanges)
        delete changes.id
        if (Object.keys(changes).length === 0) return { status: "invalid", message: "No fields to change were given." }

        const creating = id === null && !adapter.singleton
        if (creating && !adapter.canCreate) return { status: "invalid", message: `${adapter.label} items can't be created from chat.` }

        const current = creating ? null : await adapter.base(this.supabase, id)
        if (!creating && !current) return { status: "not_found", message: `${adapter.label} not found. Use list_content to find the right id.` }
        const base: Row = current ?? { ...(adapter.defaults ?? {}) }

        const prepared = adapter.prepare ? await adapter.prepare(this.supabase, changes, base) : { ok: true as const, changes }
        if (!prepared.ok) return { status: "invalid", message: prepared.message }

        const parsed = adapter.inputSchema.safeParse({ ...base, ...prepared.changes })
        if (!parsed.success) return { status: "invalid", message: "Some values are invalid. Fix them or ask the owner.", issues: zodIssues(parsed.error) }
        const input = parsed.data

        const display = adapter.display ?? (async (_supabase: SupabaseClient, row: Row) => row)
        const diff = buildDiff(current ? await display(this.supabase, current) : {}, await display(this.supabase, input))
        if (!creating && diff.length === 0) return { status: "no_change", message: "That's already the current value. Nothing to change." }

        const label = adapter.name(input).slice(0, 200)
        const changedKeys = Object.keys(prepared.changes)

        // A single publish/feature switch uses the lighter toggle action, like the list buttons.
        if (!creating && id && adapter.toggle && changedKeys.length === 1 && adapter.toggles?.includes(changedKeys[0])) {
            const field = changedKeys[0]
            const value = input[field] as boolean
            const verb = field === "is_featured" ? (value ? "Feature" : "Unfeature") : (value ? "Publish" : "Unpublish")
            return this.add({ type, op: "toggle", targetId: id, label, summary: `${verb} ${adapter.label.toLowerCase()} “${label}”`, diff, payload: { field, value } })
        }

        const summary = creating
            ? `Create ${adapter.label.toLowerCase()} “${label}”`
            : adapter.singleton ? `Update ${adapter.label} (${diff.length} field${diff.length === 1 ? "" : "s"})` : `Update ${adapter.label.toLowerCase()} “${label}” (${diff.length} field${diff.length === 1 ? "" : "s"})`
        return this.add({ type, op: creating ? "create" : "update", targetId: id ?? undefined, label, summary, diff, payload: input })
    }

    async remove (type: ContentType, id: string): Promise<ToolOutcome> {
        const adapter = adapterFor(type)
        if (!adapter.remove) return { status: "invalid", message: `${adapter.label} items can't be deleted.` }
        const current = await adapter.view(this.supabase, id)
        if (!current) return { status: "not_found", message: `${adapter.label} not found. Use list_content to find the right id.` }
        const label = adapter.name(current).slice(0, 200)
        return this.add({ type, op: "delete", targetId: id, label, summary: `Delete ${adapter.label.toLowerCase()} “${label}”`, diff: [], payload: {} })
    }
}

// Runs a confirmed proposal. The client copy is never trusted: type/op/targetId are
// checked against the registry and the payload is parsed again with the input schema.
export async function executeProposal (supabase: SupabaseClient, proposal: Proposal): Promise<ActionResult<unknown>> {
    if (!CONTENT_TYPES.includes(proposal.type)) return failure(400, "invalid_input", "Unknown content type.")
    const adapter = adapterFor(proposal.type)
    const id = proposal.targetId ?? null
    const needsId = !adapter.singleton

    switch (proposal.op) {
        case "create": {
            if (!adapter.canCreate || !adapter.save) return failure(400, "invalid_input", "This item can't be created.")
            const parsed = adapter.inputSchema.safeParse(proposal.payload)
            if (!parsed.success) return failure(400, "validation_error", "Some fields are invalid.", zodIssues(parsed.error))
            return adapter.save(supabase, null, parsed.data)
        }
        case "update": {
            if (!adapter.save || !adapter.fields) return failure(400, "invalid_input", "This item can't be updated.")
            if (needsId && !id) return failure(400, "invalid_input", "Missing item id.")
            const parsed = adapter.inputSchema.safeParse(proposal.payload)
            if (!parsed.success) return failure(400, "validation_error", "Some fields are invalid.", zodIssues(parsed.error))
            return adapter.save(supabase, needsId ? id : null, parsed.data)
        }
        case "toggle": {
            const { field, value } = proposal.payload
            if (!id || !adapter.toggle || typeof field !== "string" || !adapter.toggles?.includes(field) || typeof value !== "boolean") {
                return failure(400, "invalid_input", "Invalid toggle.")
            }
            return adapter.toggle(supabase, id, field, value)
        }
        case "delete": {
            if (!id || !adapter.remove) return failure(400, "invalid_input", "This item can't be deleted.")
            return adapter.remove(supabase, id)
        }
    }
}
