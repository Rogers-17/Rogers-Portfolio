import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getResume } from "@/lib/resume/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"
import { hashToken, listShares, newToken, shareCreateSchema } from "@/lib/resume/shares"
import { snapshotResume } from "@/lib/resume/versions"

// GET: share links for a resume. POST: create one. The link freezes the resume as saved right
// now (a named version), and the URL with its token is returned only in this response.

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    return ok(await listShares(auth.supabase, auth.id))
}

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, shareCreateSchema)
    if (!parsed.success) return parsed.response

    const resume = await getResume(auth.supabase, auth.id)
    if (!resume) return fail(404, "not_found", "Resume not found.")

    const label = parsed.data.label
    const versionId = await snapshotResume(
        auth.supabase,
        auth.id,
        { title: resume.title, template: resume.template, design: resume.design, data: resume.data },
        `Shared${label ? `: ${label}` : ""} (${new Date().toISOString().slice(0, 10)})`.slice(0, 80),
    )

    const token = newToken()
    const expiresAt = parsed.data.expires_in_days ? new Date(Date.now() + parsed.data.expires_in_days * 86_400_000).toISOString() : null
    const { data, error } = await auth.supabase
        .from("resume_shares")
        .insert({
            resume_id: auth.id,
            version_id: versionId,
            token_hash: hashToken(token),
            label,
            allow_download: parsed.data.allow_download,
            expires_at: expiresAt,
            photo_data: resume.design.showPhoto ? parsed.data.photo_data : null,
        })
        .select("id")
        .single()
    if (error) return dbError(error, "create share link")

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
    return ok({ id: data.id, url: `${origin}/r/${token}`, expires_at: expiresAt }, 201)
}
