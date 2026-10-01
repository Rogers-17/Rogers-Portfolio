import { fail, ok, parseJson } from "@/lib/admin/http"
import { DOCUMENTS_BUCKET, getDocumentRow } from "@/lib/documents/queries"
import { PREVIEWABLE, documentLinkSchema } from "@/lib/documents/schema"
import { authWithId, type IdContext } from "@/lib/resume/routes"

// Short-lived signed URL for a private document. Share links are not stored (they can't be
// revoked, they simply expire), and no URL is ever logged.
const SECONDS = { preview: 300, download: 60 } as const

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, documentLinkSchema)
    if (!parsed.success) return parsed.response
    const { purpose } = parsed.data

    const row = await getDocumentRow(auth.supabase, auth.id)
    if (!row) return fail(404, "not_found", "Document not found.")
    if (purpose === "preview" && !PREVIEWABLE.includes(row.format)) return fail(400, "not_previewable", "This file type can't be previewed. Download it instead.")

    const expiresIn = purpose === "share" ? parsed.data.expiresIn ?? 86400 : SECONDS[purpose]
    const { data, error } = await auth.supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(row.file_path, expiresIn, purpose === "preview" ? undefined : { download: row.file_name })
    if (error || !data) {
        console.error("[documents] signing failed:", error?.message)
        return fail(500, "server_error", "Couldn't create the link. Please try again.")
    }
    return ok({ url: data.signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() })
}
