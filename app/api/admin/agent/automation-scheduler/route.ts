import { createServiceSupabase } from "@/lib/supabase/server"
import { executeAutomation, type AutomationRecord } from "@/lib/agent/automations"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// Private scheduled path target. Vercel sends POST and Authorization: Bearer CRON_SECRET.
// The secret and service-role key are both required; no user data is ever returned here.
export async function POST (request: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 })
    if (!process.env.SUPABASE_SECRET_KEY) return new Response("Scheduler storage is not configured", { status: 503 })
    const executionId = request.headers.get("ce-id")
    if (!executionId || !request.headers.get("ce-specversion")) return new Response("Invalid schedule event", { status: 400 })
    const supabase = createServiceSupabase()
    const { data, error } = await supabase.from("agent_automations").select("*").eq("enabled", true).lte("next_run_at", new Date().toISOString()).order("next_run_at").limit(1)
    if (error) {
        console.error("[agent automation] schedule lookup failed:", error.message)
        return new Response("Could not load due reports", { status: 500 })
    }
    const automation = data?.[0] as AutomationRecord | undefined
    if (!automation) return new Response(null, { status: 204 })
    try {
        await executeAutomation(supabase, automation.user_id, automation, `${executionId}:${automation.id}`)
        return new Response(null, { status: 204 })
    } catch (error) {
        console.error("[agent automation] scheduled report failed:", error instanceof Error ? error.message.slice(0, 300) : "unknown")
        return new Response("Report failed", { status: 500 })
    }
}
