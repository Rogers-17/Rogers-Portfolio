import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const schema = z.object({
    projectId: z.uuid().nullable().optional(), title: z.string().trim().min(1).max(200),
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(40000), citations: z.array(z.object({ title: z.string().max(300), url: z.url() })).max(10).optional() })).min(1).max(2000),
})

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const db = auth.ctx.supabase
    if (parsed.data.projectId) {
        const { data, error } = await db.from("agent_projects").select("id").eq("id", parsed.data.projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
        if (error) return dbError(error, "verify project")
        if (!data) return fail(404, "not_found", "Project not found.")
    }
    const { data: conversation, error } = await db.from("agent_conversations").insert({ user_id: auth.ctx.user.id, project_id: parsed.data.projectId ?? null, title: parsed.data.title }).select("id").single()
    if (error || !conversation) return error ? dbError(error, "save temporary conversation") : fail(500, "save_failed", "Couldn't save this chat.")
    const rows = parsed.data.messages.map(message => ({ user_id: auth.ctx.user.id, conversation_id: conversation.id, role: message.role, content: message.content, citations: message.citations ?? [] }))
    const result = await db.from("agent_messages").insert(rows)
    if (result.error) {
        await db.from("agent_conversations").delete().eq("id", conversation.id).eq("user_id", auth.ctx.user.id)
        return dbError(result.error, "save temporary messages")
    }
    return ok({ id: conversation.id, title: parsed.data.title }, 201)
}
