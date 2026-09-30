import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"
import { listProjectRequests } from "@/lib/admin/page-queries"
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/project-request/schema"

// GET /api/admin/project-requests?status=new
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const status = new URL(request.url).searchParams.get("status")
    if (status && !(REQUEST_STATUSES as readonly string[]).includes(status)) {
        return fail(400, "invalid_status", `Status must be one of: ${REQUEST_STATUSES.join(", ")}.`)
    }
    return ok(await listProjectRequests(auth.ctx.supabase, (status as RequestStatus) || undefined))
}
