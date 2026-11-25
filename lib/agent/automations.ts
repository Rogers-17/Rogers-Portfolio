import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { AiError } from "@/lib/ai/openrouter"
import { runAgentTurn } from "@/lib/agent/run"

export type AutomationRecord = {
    id: string, user_id: string, project_id: string, name: string, instructions: string, cadence: "daily" | "weekly" | "once",
    schedule_expression: string, timezone: string, enabled: boolean, failure_count: number, next_run_at: string | null,
}

export function localDateTimeToUtc (value: string, timezone: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
    if (!match) throw new Error("Choose a valid local date and time.")
    const [, y, mo, d, h, mi] = match
    const target = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
    const requested = [Number(y), Number(mo), Number(d), Number(h), Number(mi)]
    const normalized = [new Date(target).getUTCFullYear(), new Date(target).getUTCMonth() + 1, new Date(target).getUTCDate(), new Date(target).getUTCHours(), new Date(target).getUTCMinutes()]
    if (requested.some((part, index) => part !== normalized[index])) throw new Error("Choose a valid local date and time.")
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    let candidate = target
    for (let i = 0; i < 4; i++) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(part => [part.type, part.value]))
        const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
        candidate += target - shown
    }
    const result = new Date(candidate)
    const finalParts = Object.fromEntries(formatter.formatToParts(result).map(part => [part.type, part.value]))
    if ([Number(finalParts.year), Number(finalParts.month), Number(finalParts.day), Number(finalParts.hour), Number(finalParts.minute)].some((part, index) => part !== requested[index])) {
        throw new Error("That local time does not exist because the clocks change. Choose another time.")
    }
    if (!Number.isFinite(result.getTime()) || result.getTime() <= Date.now()) throw new Error("Choose a future date and time.")
    return result.toISOString()
}

export function nextAutomationRun (cadence: AutomationRecord["cadence"], timezone: string, hour: number, minute: number, weekday: number, from = new Date()) {
    if (cadence === "once") return null
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const cursor = new Date(from)
    cursor.setUTCSeconds(0, 0)
    for (let step = 1; step <= 60 * 24 * 14; step++) {
        cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
        const parts = Object.fromEntries(formatter.formatToParts(cursor).map(part => [part.type, part.value]))
        if (Number(parts.hour) !== hour || Number(parts.minute) !== minute) continue
        if (cadence === "weekly" && weekdays.indexOf(parts.weekday) !== weekday) continue
        return cursor.toISOString()
    }
    throw new Error("Could not calculate the next schedule time for this timezone.")
}

export async function executeAutomation (supabase: SupabaseClient, userId: string, automation: AutomationRecord, executionId: string) {
    const { data: existing, error: existingError } = await supabase.from("agent_automation_runs").select("id,status").eq("queue_message_id", executionId).maybeSingle()
    if (existingError) throw new Error("Couldn't verify the research run.")
    if (existing) return { duplicate: true, runId: existing.id }
    const { data: claimed, error: claimError } = await supabase.rpc("claim_agent_automation", { automation_id: automation.id, lease_until: new Date(Date.now() + 20 * 60 * 1000).toISOString() })
    if (claimError) throw new Error("Couldn't reserve this research run.")
    if (claimed !== true) return { busy: true }
    const { data: run, error: insertError } = await supabase.from("agent_automation_runs").insert({ user_id: userId, automation_id: automation.id, queue_message_id: executionId, status: "running", started_at: new Date().toISOString() }).select("id").single()
    if (insertError || !run) {
        if (insertError?.code === "23505") return { duplicate: true, runId: null }
        throw new Error("Couldn't start the research run.")
    }
    try {
        const [project, profile] = await Promise.all([
            supabase.from("agent_projects").select("name,instructions,enabled_tools").eq("id", automation.project_id).eq("user_id", userId).maybeSingle(),
            supabase.from("agent_profiles").select("assistant_name,owner_name,response_style,ongoing_goals,custom_instructions,enabled_tools").eq("user_id", userId).maybeSingle(),
        ])
        if (project.error || !project.data || profile.error) throw new Error("The destination project is no longer available.")
        const globalTools = profile.data?.enabled_tools ?? ["web_research"]
        if (!globalTools.includes("web_research") || !project.data.enabled_tools.includes("web_research")) throw new Error("Web research is disabled in the current tool settings.")
        const enabledTools = ["web_research"]
        const safeAssistantName = profile.data?.assistant_name.replace(/[\r\n]/g, " ").slice(0, 60) ?? "Rogers"
        const profileContext = profile.data ? `Assistant name: ${safeAssistantName}\nOwner profile (JSON): ${JSON.stringify({ owner_name: profile.data.owner_name, response_style: profile.data.response_style, ongoing_goals: profile.data.ongoing_goals, custom_instructions: profile.data.custom_instructions })}` : "Assistant name: Rogers"
        const result = await runAgentTurn({
            supabase, userId, messages: [{ role: "user", text: `Research task: ${automation.instructions}\n\nWrite a concise, useful report. Verify recent claims with search, include dates, and cite sources. This task is read-only.` }],
            context: `${profileContext}\nProject context (JSON): ${JSON.stringify({ name: project.data.name, instructions: project.data.instructions })}\nScheduled automation instructions (owner-provided): ${JSON.stringify(automation.instructions)}\nThis run is read-only research; do not mutate site data.`,
            readOnly: true, enabledTools, maxLlmCalls: 3,
        })
        if (!result.reply.trim()) throw new Error("Research returned an empty report.")
        const title = `${automation.name} · ${new Date().toISOString().slice(0, 10)}`.slice(0, 200)
        const { data: conversation, error: conversationError } = await supabase.from("agent_conversations").insert({ user_id: userId, project_id: automation.project_id, title }).select("id").single()
        if (conversationError || !conversation) throw new Error("Research completed, but the report could not be saved to the project.")
        const { error: messageError } = await supabase.from("agent_messages").insert({ user_id: userId, conversation_id: conversation.id, role: "assistant", content: result.reply, citations: result.citations ?? [] })
        if (messageError) {
            await supabase.from("agent_conversations").delete().eq("id", conversation.id).eq("user_id", userId)
            throw new Error("Research completed, but the report could not be saved to the project.")
        }
        await supabase.from("agent_automation_runs").update({ status: "completed", report_title: title, report_content: result.reply, citations: result.citations ?? [], finished_at: new Date().toISOString() }).eq("id", run.id)
        const next = automation.cadence === "once" ? null : nextAutomationRun(automation.cadence, automation.timezone, Number(automation.schedule_expression.split(" ")[1]), Number(automation.schedule_expression.split(" ")[0]), Number(automation.schedule_expression.split(" ")[4]))
        const successUpdate: Record<string, unknown> = { last_run_at: new Date().toISOString(), next_run_at: next, failure_count: 0, locked_until: null }
        if (automation.cadence === "once") successUpdate.enabled = false
        await supabase.from("agent_automations").update(successUpdate).eq("id", automation.id)
        return { duplicate: false, runId: run.id, conversationId: conversation.id, report: result.reply, citations: result.citations ?? [] }
    } catch (error) {
        const summary = error instanceof AiError ? error.message : error instanceof Error ? error.message : "Research run failed."
        const nextFailure = automation.failure_count + 1
        await supabase.from("agent_automation_runs").update({ status: "failed", error_summary: summary.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", run.id)
        const retryAt = automation.cadence === "once" ? automation.next_run_at : nextAutomationRun(automation.cadence, automation.timezone, Number(automation.schedule_expression.split(" ")[1]), Number(automation.schedule_expression.split(" ")[0]), Number(automation.schedule_expression.split(" ")[4]))
        const failureUpdate: Record<string, unknown> = { failure_count: nextFailure, next_run_at: retryAt, locked_until: null }
        if (nextFailure >= 3) failureUpdate.enabled = false
        await supabase.from("agent_automations").update(failureUpdate).eq("id", automation.id)
        throw error
    }
}
