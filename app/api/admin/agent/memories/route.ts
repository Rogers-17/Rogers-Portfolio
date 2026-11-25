import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok } from "@/lib/admin/http"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { data, error } = await auth.ctx.supabase.from("agent_memory_sources").select("id,provider,source_name,external_id,title,conversation_date,created_at").eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false }).limit(500)
    if (error) return dbError(error, "list assistant memories")
    return ok(data)
}
