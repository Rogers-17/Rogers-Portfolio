import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { coverLetterInputSchema } from "@/lib/resume/cover-letter"
import { getCoverLetter } from "@/lib/resume/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Cover letter")
    if (!auth.ok) return auth.response
    const letter = await getCoverLetter(auth.supabase, auth.id)
    return letter ? ok(letter) : fail(404, "not_found", "Cover letter not found.")
}

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Cover letter")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, coverLetterInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase.from("cover_letters").update(parsed.data).eq("id", auth.id).select("id")
    if (error) return dbError(error, "update cover letter")
    if (!data?.length) return fail(404, "not_found", "Cover letter not found.")
    return ok({ id: auth.id })
}
