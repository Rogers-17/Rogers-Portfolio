import { dbError, fail, ok } from "@/lib/admin/http"
import { DOCUMENTS_BUCKET } from "@/lib/documents/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"

// Deletes the row first, then the stored file. A failed file removal is only logged: the
// row is gone, so the file can no longer be reached from the dashboard.
export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    const { data, error } = await auth.supabase.from("documents").delete().eq("id", auth.id).select("file_path")
    if (error) return dbError(error, "delete document")
    if (!data?.length) return fail(404, "not_found", "Document not found.")

    const { error: removeError } = await auth.supabase.storage.from(DOCUMENTS_BUCKET).remove([data[0].file_path])
    if (removeError) console.error("[documents] file removal failed:", removeError.message)
    return ok({ id: auth.id, deleted: true })
}
