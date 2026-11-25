import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const createSchema = z.object({ projectId: z.uuid().nullable().optional(), title: z.string().trim().min(1).max(200).default("New chat") })

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const db = auth.ctx.supabase
    const id = new URL(request.url).searchParams.get("id")
    if (id) {
        const conversation = await db.from("agent_conversations").select("*").eq("id", id).eq("user_id", auth.ctx.user.id).maybeSingle()
        if (conversation.error) return dbError(conversation.error, "load conversation")
        if (!conversation.data) return fail(404, "not_found", "Conversation not found.")
        const messages = await db.from("agent_messages").select("id,role,content,citations,created_at").eq("conversation_id", id).eq("user_id", auth.ctx.user.id).order("created_at", { ascending: true }).limit(2000)
        if (messages.error) return dbError(messages.error, "load conversation messages")
        return ok({ ...conversation.data, messages: messages.data })
    }
    const url = new URL(request.url)
    const q = url.searchParams.get("q")?.trim()
    let query = db.from("agent_conversations").select("id,project_id,title,archived,created_at,updated_at").eq("user_id", auth.ctx.user.id).order("updated_at", { ascending: false }).limit(100)
    if (q) {
        const [byTitle, byMessage] = await Promise.all([
            db.from("agent_conversations").select("id,project_id,title,archived,created_at,updated_at").eq("user_id", auth.ctx.user.id).ilike("title", `%${q.slice(0, 100)}%`).limit(100),
            db.from("agent_messages").select("conversation_id").eq("user_id", auth.ctx.user.id).textSearch("search_vector", q.slice(0, 100), { type: "websearch", config: "english" }).limit(200),
        ])
        if (byTitle.error || byMessage.error) return fail(500, "search_failed", "Couldn't search saved conversations.")
        const ids = [...new Set([...(byTitle.data ?? []).map(item => item.id), ...(byMessage.data ?? []).map(item => item.conversation_id)])]
        if (ids.length === 0) return ok([])
        query = db.from("agent_conversations").select("id,project_id,title,archived,created_at,updated_at").eq("user_id", auth.ctx.user.id).in("id", ids).order("updated_at", { ascending: false }).limit(100)
    }
    const { data, error } = await query
    if (error) return dbError(error, "list conversations")
    return ok(data)
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, createSchema)
    if (!parsed.success) return parsed.response
    if (parsed.data.projectId) {
        const { data, error } = await auth.ctx.supabase.from("agent_projects").select("id").eq("id", parsed.data.projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
        if (error) return dbError(error, "verify assistant project")
        if (!data) return fail(404, "not_found", "Project not found.")
    }
    const { data, error } = await auth.ctx.supabase.from("agent_conversations").insert({ user_id: auth.ctx.user.id, project_id: parsed.data.projectId ?? null, title: parsed.data.title }).select("*").single()
    if (error) return dbError(error, "create conversation")
    return ok(data, 201)
}
