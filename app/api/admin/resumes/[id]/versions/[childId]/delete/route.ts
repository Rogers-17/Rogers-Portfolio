import { dbError, fail, ok } from "@/lib/admin/http"
import { authWithChild, type NestedContext } from "@/lib/resume/version-routes"

export async function POST (request: Request, context: NestedContext) {
    const auth = await authWithChild(request, context, "Version")
    if (!auth.ok) return auth.response

    // A version behind an active share link can't be deleted (revoke the link first).
    const { count } = await auth.supabase
        .from("resume_shares")
        .select("id", { count: "exact", head: true })
        .eq("version_id", auth.childId)
        .is("revoked_at", null)
    if (count) return fail(409, "in_use", "This version is used by a share link. Revoke the link first.")

    const { data, error } = await auth.supabase.from("resume_versions").delete().eq("resume_id", auth.id).eq("id", auth.childId).select("id")
    if (error) return dbError(error, "delete version")
    if (!data?.length) return fail(404, "not_found", "Version not found.")
    return ok({ id: auth.childId, deleted: true })
}
