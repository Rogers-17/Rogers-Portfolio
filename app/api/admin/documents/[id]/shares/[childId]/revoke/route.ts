import { dbError, fail, ok } from "@/lib/admin/http"
import { authWithChild, type NestedContext } from "@/lib/resume/version-routes"

// Expires a share link now (it can't be turned back on; create a new one instead).
export async function POST (request: Request, context: NestedContext) {
    const auth = await authWithChild(request, context, "Share link")
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabase
        .from("document_shares")
        .update({ revoked_at: new Date().toISOString() })
        .eq("document_id", auth.id)
        .eq("id", auth.childId)
        .is("revoked_at", null)
        .select("id")
    if (error) return dbError(error, "expire document share link")
    if (!data?.length) return fail(404, "not_found", "Share link not found or already expired.")
    return ok({ id: auth.childId, revoked: true })
}
