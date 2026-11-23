import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { listJobs } from "@/lib/jobs/queries"
import { jobInputSchema } from "@/lib/jobs/schema"
import { createJob } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

// GET /api/admin/jobs?archived=1 · POST creates an application at the top of its column.
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await listJobs(auth.ctx.supabase, new URL(request.url).searchParams.get("archived") === "1"))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, jobInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await createJob(auth.ctx.supabase, parsed.data), 201)
}
