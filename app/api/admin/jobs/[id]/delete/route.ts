import { dbError, fail, ok } from "@/lib/admin/http"
import { authWithId, type IdContext } from "@/lib/resume/routes"

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Application")
    if (!auth.ok) return auth.response
    const { data, error } = await auth.supabase.from("job_applications").delete().eq("id", auth.id).select("id")
    if (error) return dbError(error, "delete application")
    if (!data?.length) return fail(404, "not_found", "Application not found.")
    return ok({ id: auth.id, deleted: true })
}
