import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { DOCUMENTS_BUCKET } from "@/lib/documents/queries"
import { DOCUMENT_FORMATS, FORMAT_MIME, MAX_DOCUMENT_BYTES, documentSignSchema, formatFromName } from "@/lib/documents/schema"

// Step 1 of a document upload: approve the size and extension, then return a signed upload
// token for inbox/<uuid>.<ext> (used for a resumable TUS upload, valid 2 hours) and the
// Content-Type the browser must send. Step 2 is POST /api/admin/documents, which checks the
// real contents before saving.
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, documentSignSchema)
    if (!parsed.success) return parsed.response
    const { fileName, size } = parsed.data

    if (size > MAX_DOCUMENT_BYTES) return fail(413, "too_large", "File is too large (max 50 MB).")
    const format = formatFromName(fileName)
    if (!format) return fail(400, "invalid_type", `Unsupported file type. Allowed: ${DOCUMENT_FORMATS.join(", ").toUpperCase()}.`)

    const path = `inbox/${crypto.randomUUID()}.${format}`
    const { data, error } = await auth.ctx.supabase.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path)
    if (error) {
        console.error("[documents] sign upload failed:", error.message)
        return fail(500, "upload_failed", "Couldn't start the upload. Please try again.")
    }
    return ok({ path, token: data.token, contentType: FORMAT_MIME[format] }, 201)
}
