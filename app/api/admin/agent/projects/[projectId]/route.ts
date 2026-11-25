import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const schema = z.object({ action: z.enum(["update", "delete"]), name: z.string().trim().min(1).max(120).optional(), instructions: z.string().max(5000).optional(), enabled_tools: z.array(z.string().max(40)).max(6).optional() })

export async function GET (request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { projectId } = await params
    const { data, error } = await auth.ctx.supabase.from("agent_projects").select("*").eq("id", projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (error) return dbError(error, "get assistant project")
    return data ? ok(data) : fail(404, "not_found", "Project not found.")
}

export async function POST (request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { projectId } = await params
    if (parsed.data.action === "delete") {
        const { data: files, error: filesError } = await auth.ctx.supabase.from("agent_project_files").select("storage_path").eq("project_id", projectId).eq("user_id", auth.ctx.user.id)
        if (filesError) return dbError(filesError, "list project files before delete")
        if (files?.length) {
            const { error: storageError } = await auth.ctx.supabase.storage.from("agent-project-files").remove(files.map(file => file.storage_path))
            if (storageError) return fail(500, "storage_cleanup_failed", "Project files could not be removed. Try again.")
        }
        const { error } = await auth.ctx.supabase.from("agent_projects").delete().eq("id", projectId).eq("user_id", auth.ctx.user.id)
        if (error) return dbError(error, "delete assistant project")
        return ok({ id: projectId, deleted: true })
    }
    const changes: { name?: string, instructions?: string, enabled_tools?: string[] } = {}
    if (parsed.data.name !== undefined) changes.name = parsed.data.name
    if (parsed.data.instructions !== undefined) changes.instructions = parsed.data.instructions
    if (parsed.data.enabled_tools !== undefined) changes.enabled_tools = parsed.data.enabled_tools
    const { data, error } = await auth.ctx.supabase.from("agent_projects").update(changes).eq("id", projectId).eq("user_id", auth.ctx.user.id).select("*").maybeSingle()
    if (error) return dbError(error, "update assistant project")
    return data ? ok(data) : fail(404, "not_found", "Project not found.")
}
