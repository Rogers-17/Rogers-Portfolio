import { dbError, fail, ok } from "@/lib/admin/http"
import { authWithChild, type NestedContext } from "@/lib/resume/version-routes"

// Deletes a share link and its open count. An active link stops working immediately.
export async function POST (request: Request, context: NestedContext) {
    const auth = await authWithChild(request, context, "Share link")
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabase
        .from("document_shares")
        .delete()
        .eq("document_id", auth.id)
        .eq("id", auth.childId)
        .select("id")
    if (error) return dbError(error, "delete document share link")
    if (!data?.length) return fail(404, "not_found", "Share link not found.")
    return ok({ id: auth.childId, deleted: true })
}
