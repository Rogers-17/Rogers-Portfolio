import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"

const tools = ["site_read", "site_write", "chat_search", "project_files", "web_research", "github_stats"] as const
const profileSchema = z.object({
    assistant_name: z.string().trim().min(1).max(60), owner_name: z.string().trim().max(100),
    response_style: z.string().max(2000), ongoing_goals: z.string().max(5000), custom_instructions: z.string().max(5000),
    enabled_tools: z.array(z.enum(tools)).max(6), search_saved_chats: z.boolean().default(false),
})

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { data, error } = await auth.ctx.supabase.from("agent_profiles").select("*").eq("user_id", auth.ctx.user.id).maybeSingle()
    if (error) return dbError(error, "load assistant profile")
    return ok(data ?? { assistant_name: "Rogers", owner_name: "", response_style: "", ongoing_goals: "", custom_instructions: "", enabled_tools: ["site_read", "site_write", "chat_search", "web_research"], search_saved_chats: false })
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, profileSchema)
    if (!parsed.success) return parsed.response
    const { data, error } = await auth.ctx.supabase.from("agent_profiles").upsert({ user_id: auth.ctx.user.id, ...parsed.data }, { onConflict: "user_id" }).select("*").single()
    if (error) return dbError(error, "save assistant profile")
    return ok(data)
}
