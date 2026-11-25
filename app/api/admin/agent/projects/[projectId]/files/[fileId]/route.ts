import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"

export async function POST (request: Request, { params }: { params: Promise<{ projectId: string, fileId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { projectId, fileId } = await params
    const { data, error } = await auth.ctx.supabase.from("agent_project_files").select("storage_path").eq("id", fileId).eq("project_id", projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (error) return dbError(error, "load project file")
    if (!data) return fail(404, "not_found", "Project file not found.")
    const { error: storageError } = await auth.ctx.supabase.storage.from("agent-project-files").remove([data.storage_path])
    if (storageError) return fail(500, "storage_cleanup_failed", "The private file could not be removed. Try again.")
    const { error: deleteError } = await auth.ctx.supabase.from("agent_project_files").delete().eq("id", fileId).eq("user_id", auth.ctx.user.id)
    if (deleteError) return dbError(deleteError, "delete project file")
    return ok({ id: fileId, deleted: true })
}
