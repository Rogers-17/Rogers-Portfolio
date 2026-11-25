import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"

export const dynamic = "force-dynamic"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const db = auth.ctx.supabase
    const [profile, projects, conversations, memories, automations] = await Promise.all([
        db.from("agent_profiles").select("*").eq("user_id", auth.ctx.user.id).maybeSingle(),
        db.from("agent_projects").select("id,name,instructions,enabled_tools,created_at,updated_at").eq("user_id", auth.ctx.user.id).order("updated_at", { ascending: false }),
        db.from("agent_conversations").select("id,project_id,title,archived,created_at,updated_at").eq("user_id", auth.ctx.user.id).order("updated_at", { ascending: false }).limit(100),
        db.from("agent_memory_sources").select("id,provider,source_name,title,conversation_date,created_at").eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false }).limit(500),
        db.from("agent_automations").select("id,project_id,name,instructions,cadence,schedule_expression,timezone,enabled,next_run_at,last_run_at,failure_count").eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false }),
    ])
    const error = profile.error ?? projects.error ?? conversations.error ?? memories.error ?? automations.error
    if (error) return fail(500, "workspace_unavailable", "Couldn't load the assistant workspace. Run the personal agent workspace migration first.")
    return ok({
        profile: profile.data ?? { assistant_name: "Rogers", owner_name: "", response_style: "", ongoing_goals: "", custom_instructions: "", enabled_tools: ["site_read", "site_write", "chat_search", "web_research"], search_saved_chats: false },
        projects: projects.data ?? [], conversations: conversations.data ?? [], memories: memories.data ?? [], automations: automations.data ?? [],
        automationReady: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SECRET_KEY),
    })
}
