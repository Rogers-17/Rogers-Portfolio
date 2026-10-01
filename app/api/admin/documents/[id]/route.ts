import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getDocument } from "@/lib/documents/queries"
import { documentDetailsSchema } from "@/lib/documents/schema"
import { authWithId, type IdContext } from "@/lib/resume/routes"

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    const document = await getDocument(auth.supabase, auth.id)
    return document ? ok(document) : fail(404, "not_found", "Document not found.")
}

// POST updates the details (the file itself can't be replaced).
export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Document")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, documentDetailsSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase.from("documents").update(parsed.data).eq("id", auth.id).select("id")
    if (error) return dbError(error, "update document")
    if (!data?.length) return fail(404, "not_found", "Document not found.")
    return ok(await getDocument(auth.supabase, auth.id))
}
