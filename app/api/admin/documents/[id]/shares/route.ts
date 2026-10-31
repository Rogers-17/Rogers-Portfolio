import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getDocumentRow } from "@/lib/documents/queries"
import { documentShareCreateSchema } from "@/lib/documents/schema"
import { listDocumentShares, newDocumentToken } from "@/lib/documents/shares"
import { hashToken } from "@/lib/resume/shares"
import { authWithId, type IdContext } from "@/lib/resume/routes"
import { hasServiceKey } from "@/lib/supabase/server"

// GET: share links for a document. POST: create one. The URL with its token is returned only
// in this response.

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    try {
        return ok(await listDocumentShares(auth.supabase, auth.id))
    } catch (failure) {
        console.error("[documents] list shares failed:", failure instanceof Error ? failure.message : "unknown")
        return fail(500, "server_error", "Couldn't load the links. Please try again.")
    }
}

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, documentShareCreateSchema)
    if (!parsed.success) return parsed.response

    // A link that can't open is worse than none, so refuse before creating it.
    if (!hasServiceKey()) return fail(503, "not_configured", "Sharing isn't set up yet. Add SUPABASE_SECRET_KEY to the server environment.")
    if (!(await getDocumentRow(auth.supabase, auth.id))) return fail(404, "not_found", "Document not found.")

    const token = newDocumentToken()
    const expiresAt = parsed.data.expires_in ? new Date(Date.now() + parsed.data.expires_in * 1000).toISOString() : null
    const { data, error } = await auth.supabase
        .from("document_shares")
        .insert({ document_id: auth.id, token_hash: hashToken(token), label: parsed.data.label, expires_at: expiresAt })
        .select("id")
        .single()
    if (error) return dbError(error, "create document share link")

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
    return ok({ id: data.id, url: `${origin}/d/${token}`, expires_at: expiresAt }, 201)
}
