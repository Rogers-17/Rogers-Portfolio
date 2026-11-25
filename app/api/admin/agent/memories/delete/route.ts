import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const schema = z.object({ sourceId: z.uuid() })
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { error, count } = await auth.ctx.supabase.from("agent_memory_sources").delete({ count: "exact" }).eq("id", parsed.data.sourceId).eq("user_id", auth.ctx.user.id)
    if (error) return dbError(error, "delete assistant memory source")
    return count ? ok({ id: parsed.data.sourceId, deleted: true }) : fail(404, "not_found", "Memory source not found.")
}
