import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { jobMoveSchema } from "@/lib/jobs/schema"

// Board drag & drop: new status for one card + the full order of its target column.
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, jobMoveSchema)
    if (!parsed.success) return parsed.response

    const { error } = await auth.ctx.supabase.rpc("admin_move_application", { p_id: parsed.data.id, p_status: parsed.data.status, p_ids: parsed.data.ids })
    if (error) return dbError(error, "move application")
    return ok({ id: parsed.data.id, status: parsed.data.status })
}
