import { dbError, fail, ok } from "@/lib/admin/http"
import { authWithId, type IdContext } from "@/lib/resume/routes"

// Deletes the resume and its photo, unless another resume (e.g. a duplicate) still uses it.
export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabase.from("resumes").delete().eq("id", auth.id).select("data")
    if (error) return dbError(error, "delete resume")
    if (!data?.length) return fail(404, "not_found", "Resume not found.")

    const photoPath = (data[0].data as { contact?: { photoPath?: unknown } })?.contact?.photoPath
    if (typeof photoPath === "string") {
        const { count } = await auth.supabase.from("resumes").select("id", { count: "exact", head: true }).eq("data->contact->>photoPath", photoPath)
        if (!count) {
            const { error: storageError } = await auth.supabase.storage.from("resume-assets").remove([photoPath])
            if (storageError) console.error("[resume] photo cleanup failed:", storageError.message)
        }
    }
    return ok({ id: auth.id, deleted: true })
}
