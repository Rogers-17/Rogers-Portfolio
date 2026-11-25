import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const schema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("rename"), title: z.string().trim().min(1).max(200) }),
    z.object({ action: z.literal("archive"), archived: z.boolean() }),
    z.object({ action: z.literal("assign_project"), projectId: z.uuid().nullable() }),
    z.object({ action: z.literal("delete") }),
])

export async function GET (request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { conversationId } = await params
    const db = auth.ctx.supabase
    const conversation = await db.from("agent_conversations").select("*").eq("id", conversationId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (conversation.error) return dbError(conversation.error, "load conversation")
    if (!conversation.data) return fail(404, "not_found", "Conversation not found.")
    const messages = await db.from("agent_messages").select("id,role,content,citations,created_at").eq("conversation_id", conversationId).eq("user_id", auth.ctx.user.id).order("created_at", { ascending: true }).limit(2000)
    if (messages.error) return dbError(messages.error, "load conversation messages")
    return ok({ ...conversation.data, messages: messages.data })
}

export async function POST (request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { conversationId } = await params
    if (parsed.data.action === "delete") {
        const { error } = await auth.ctx.supabase.from("agent_conversations").delete().eq("id", conversationId).eq("user_id", auth.ctx.user.id)
        if (error) return dbError(error, "delete conversation")
        return ok({ id: conversationId, deleted: true })
    }
    if (parsed.data.action === "assign_project" && parsed.data.projectId) {
        const { data, error } = await auth.ctx.supabase.from("agent_projects").select("id").eq("id", parsed.data.projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
        if (error) return dbError(error, "verify assistant project")
        if (!data) return fail(404, "not_found", "Project not found.")
    }
    const changes = parsed.data.action === "rename" ? { title: parsed.data.title } : parsed.data.action === "archive" ? { archived: parsed.data.archived } : { project_id: parsed.data.projectId }
    const { data, error } = await auth.ctx.supabase.from("agent_conversations").update(changes).eq("id", conversationId).eq("user_id", auth.ctx.user.id).select("*").maybeSingle()
    if (error) return dbError(error, "update conversation")
    return data ? ok(data) : fail(404, "not_found", "Conversation not found.")
}
