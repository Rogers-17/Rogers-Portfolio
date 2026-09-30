import { z } from "zod"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { authWithId, type IdContext } from "@/lib/resume/routes"

const bodySchema = z.object({ archived: z.boolean() })

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase.from("resumes").update({ is_archived: parsed.data.archived }).eq("id", auth.id).select("id")
    if (error) return dbError(error, "archive resume")
    if (!data?.length) return fail(404, "not_found", "Resume not found.")
    return ok({ id: auth.id, archived: parsed.data.archived })
}
