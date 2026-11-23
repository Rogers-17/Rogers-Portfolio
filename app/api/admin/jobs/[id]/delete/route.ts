import { authWithId, type IdContext } from "@/lib/resume/routes"
import { deleteJob } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Application")
    if (!auth.ok) return auth.response
    return toResponse(await deleteJob(auth.supabase, auth.id))
}
