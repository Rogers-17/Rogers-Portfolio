import { requireAdminApi } from "@/lib/admin/auth"
import { ok } from "@/lib/admin/http"
import { usageSummary } from "@/lib/ai/openrouter"

// GET /api/admin/ai/usage: today's AI request count, the daily limit and the model.
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await usageSummary(auth.ctx.supabase))
}
