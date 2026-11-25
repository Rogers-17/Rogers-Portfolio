import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"

export async function GET (request: Request, { params }: { params: Promise<{ automationId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { automationId } = await params
    const { data: task, error: taskError } = await auth.ctx.supabase.from("agent_automations").select("id").eq("id", automationId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (taskError) return dbError(taskError, "verify research schedule")
    if (!task) return fail(404, "not_found", "Research schedule not found.")
    const { data, error } = await auth.ctx.supabase.from("agent_automation_runs").select("id,status,report_title,report_content,citations,error_summary,started_at,finished_at,created_at").eq("automation_id", automationId).eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false }).limit(100)
    if (error) return dbError(error, "load research run history")
    return ok(data)
}
