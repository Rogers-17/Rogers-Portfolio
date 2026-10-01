import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getJob } from "@/lib/jobs/queries"
import { jobInputSchema } from "@/lib/jobs/schema"
import { authWithId, type IdContext } from "@/lib/resume/routes"

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

    const { data, error } = await auth.supabase.from("job_applications").update(parsed.data).eq("id", auth.id).select("id, status_changed_at")
    if (error) return dbError(error, "update application")
    if (!data?.length) return fail(404, "not_found", "Application not found.")
    return ok({ id: auth.id, status_changed_at: data[0].status_changed_at })
}
