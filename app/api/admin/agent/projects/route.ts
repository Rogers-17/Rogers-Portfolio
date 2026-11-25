import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"

const projectSchema = z.object({ name: z.string().trim().min(1).max(120), instructions: z.string().max(5000).default(""), enabled_tools: z.array(z.string().max(40)).max(6).default(["site_read", "site_write", "chat_search", "web_research", "project_files"]) })

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { data, error } = await auth.ctx.supabase.from("agent_projects").select("*").eq("user_id", auth.ctx.user.id).order("updated_at", { ascending: false })
    if (error) return dbError(error, "list assistant projects")
    return ok(data)
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, projectSchema)
    if (!parsed.success) return parsed.response
    const { data, error } = await auth.ctx.supabase.from("agent_projects").insert({ ...parsed.data, user_id: auth.ctx.user.id }).select("*").single()
    if (error) return dbError(error, "create assistant project")
    return ok(data, 201)
}
