import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getResume } from "@/lib/resume/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"
import { resumeSaveSchema } from "@/lib/resume/schema"
import { snapshotResume } from "@/lib/resume/versions"

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    const resume = await getResume(auth.supabase, auth.id)
    return resume ? ok(resume) : fail(404, "not_found", "Resume not found.")
}

// Saves the whole resume (meta + design + document).
export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, resumeSaveSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase.from("resumes").update(parsed.data).eq("id", auth.id).select("id, updated_at")
    if (error) return dbError(error, "update resume")
    if (!data?.length) return fail(404, "not_found", "Resume not found.")

    // Version history: never let a snapshot problem fail the save itself.
    try {
        const { title, template, design, data: document } = parsed.data
        await snapshotResume(auth.supabase, auth.id, { title, template, design, data: document })
    } catch (snapshotError) {
        console.error("[resume] snapshot failed:", snapshotError)
    }

    return ok({ id: auth.id, updated_at: data[0].updated_at })
}
