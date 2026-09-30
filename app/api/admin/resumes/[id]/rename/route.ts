import { z } from "zod"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { authWithId, type IdContext } from "@/lib/resume/routes"

const bodySchema = z.object({
    title: z.string().trim().min(1, "Give the resume a name").max(120),
    target_role: z.string().trim().max(120).nullish().transform(value => value || null),
})

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase.from("resumes").update(parsed.data).eq("id", auth.id).select("id")
    if (error) return dbError(error, "rename resume")
    if (!data?.length) return fail(404, "not_found", "Resume not found.")
    return ok({ id: auth.id, ...parsed.data })
}
