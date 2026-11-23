import { fail, ok, parseJson } from "@/lib/admin/http"
import { getJob } from "@/lib/jobs/queries"
import { jobInputSchema } from "@/lib/jobs/schema"
import { authWithId, type IdContext } from "@/lib/resume/routes"
import { updateJob } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Application")
    if (!auth.ok) return auth.response
    const job = await getJob(auth.supabase, auth.id)
    return job ? ok(job) : fail(404, "not_found", "Application not found.")
}

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Application")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, jobInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await updateJob(auth.supabase, auth.id, parsed.data))
}
