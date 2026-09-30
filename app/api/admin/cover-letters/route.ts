import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { coverLetterInputSchema } from "@/lib/resume/cover-letter"
import { listCoverLetters } from "@/lib/resume/queries"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await listCoverLetters(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, coverLetterInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase.from("cover_letters").insert(parsed.data).select("id").single()
    if (error) return dbError(error, "create cover letter")
    return ok({ id: data.id }, 201)
}
