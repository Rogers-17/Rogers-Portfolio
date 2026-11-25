import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { executeAutomation, type AutomationRecord } from "@/lib/agent/automations"
import { AiError } from "@/lib/ai/openrouter"

const schema = z.discriminatedUnion("action", [z.object({ action: z.enum(["pause", "enable", "delete"]) }), z.object({ action: z.literal("run_now") })])
export const maxDuration = 60

export async function POST (request: Request, { params }: { params: Promise<{ automationId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { automationId } = await params
    const db = auth.ctx.supabase
    const { data: automation, error } = await db.from("agent_automations").select("*").eq("id", automationId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (error) return dbError(error, "load research schedule")
    if (!automation) return fail(404, "not_found", "Research schedule not found.")
    if (parsed.data.action === "delete") {
        const result = await db.from("agent_automations").delete().eq("id", automationId).eq("user_id", auth.ctx.user.id)
        return result.error ? dbError(result.error, "delete research schedule") : ok({ id: automationId, deleted: true })
    }
    if (parsed.data.action === "pause" || parsed.data.action === "enable") {
        if (parsed.data.action === "enable" && (!process.env.CRON_SECRET || !process.env.SUPABASE_SECRET_KEY)) return fail(503, "scheduler_not_configured", "Set CRON_SECRET and SUPABASE_SECRET_KEY before enabling scheduled reports.")
        const result = await db.from("agent_automations").update({ enabled: parsed.data.action === "enable", failure_count: 0 }).eq("id", automationId).eq("user_id", auth.ctx.user.id).select("*").single()
        return result.error ? dbError(result.error, "update research schedule") : ok(result.data)
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await db.from("agent_automation_runs").select("id", { count: "exact", head: true }).eq("automation_id", automationId).eq("user_id", auth.ctx.user.id).like("queue_message_id", "manual:%").gte("created_at", since)
    if (countError) return dbError(countError, "check research run budget")
    if ((count ?? 0) >= 3) return fail(429, "task_budget_reached", "This task has reached its limit of three manual runs in 24 hours.")
    if (!automation.enabled) return fail(409, "automation_paused", "Enable this schedule before starting a manual run.")
    const { error: dueError } = await db.from("agent_automations").update({ next_run_at: new Date().toISOString() }).eq("id", automationId).eq("user_id", auth.ctx.user.id)
    if (dueError) return dbError(dueError, "queue research run")
    try {
        const result = await executeAutomation(db, auth.ctx.user.id, automation as AutomationRecord, `manual:${crypto.randomUUID()}`)
        if ("busy" in result && result.busy) return fail(409, "run_in_progress", "This research task is already running.")
        return ok(result)
    } catch (error) {
        if (error instanceof AiError) return fail(error.status, error.code, error.message)
        console.error("[agent automation] manual run failed:", error instanceof Error ? error.message : error)
        return fail(502, "run_failed", "The report could not be completed. Check the run history and try again.")
    }
}
