import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { localDateTimeToUtc, nextAutomationRun } from "@/lib/agent/automations"

const schema = z.object({ name: z.string().trim().min(1).max(120), instructions: z.string().trim().min(1).max(5000), projectId: z.uuid(), cadence: z.enum(["daily", "weekly", "once"]), hour: z.number().int().min(0).max(23).optional(), minute: z.number().int().min(0).max(59).optional(), weekday: z.number().int().min(0).max(6).default(1), runAt: z.string().optional(), timezone: z.string().trim().min(1).max(80) })

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { data, error } = await auth.ctx.supabase.from("agent_automations").select("*").eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false })
    if (error) return dbError(error, "list research automations")
    return ok(data)
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const item = parsed.data
    const { data: project, error: projectError } = await auth.ctx.supabase.from("agent_projects").select("id,enabled_tools").eq("id", item.projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (projectError) return dbError(projectError, "verify report project")
    if (!project) return fail(404, "not_found", "Destination project not found.")
    if (!project.enabled_tools.includes("web_research")) return fail(400, "tool_disabled", "Enable web research in this project before creating a report schedule.")
    const { data: profile, error: profileError } = await auth.ctx.supabase.from("agent_profiles").select("enabled_tools").eq("user_id", auth.ctx.user.id).maybeSingle()
    if (profileError) return dbError(profileError, "check assistant research tools")
    if (profile && !profile.enabled_tools.includes("web_research")) return fail(400, "tool_disabled", "Enable web research in assistant settings before scheduling a report.")
    if (!process.env.CRON_SECRET || !process.env.SUPABASE_SECRET_KEY) return fail(503, "scheduler_not_configured", "Scheduled reports need CRON_SECRET and SUPABASE_SECRET_KEY in the deployment environment. Save this as a draft, then enable it after setup.")
    let next: string
    let expression: string
    try {
        if (item.cadence === "once") {
            if (!item.runAt) return fail(400, "missing_run_time", "Choose a future date and time for this one-time report.")
            next = localDateTimeToUtc(item.runAt, item.timezone)
            expression = item.runAt
        } else {
            if (item.hour === undefined || item.minute === undefined) return fail(400, "missing_run_time", "Choose a report time.")
            next = nextAutomationRun(item.cadence, item.timezone, item.hour, item.minute, item.weekday)!
            expression = item.cadence === "daily" ? `${item.minute} ${item.hour} * * *` : `${item.minute} ${item.hour} * * ${item.weekday}`
        }
    } catch { return fail(400, "invalid_timezone", "Use a valid IANA timezone and future local time, such as Africa/Monrovia.") }
    const { data, error } = await auth.ctx.supabase.from("agent_automations").insert({ user_id: auth.ctx.user.id, project_id: item.projectId, name: item.name, instructions: item.instructions, cadence: item.cadence, schedule_expression: expression, timezone: item.timezone, enabled: true, next_run_at: next }).select("*").single()
    if (error) return dbError(error, "create research schedule")
    return ok(data, 201)
}
