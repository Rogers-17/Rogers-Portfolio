import { z } from "zod"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { authWithChild, type NestedContext } from "@/lib/resume/version-routes"
import { getVersion } from "@/lib/resume/versions"

// GET: one version with its content (preview / restore). POST: rename (or name) it.

const bodySchema = z.object({ name: z.string().trim().min(1, "Give the version a name").max(80) })

export async function GET (request: Request, context: NestedContext) {
    const auth = await authWithChild(request, context, "Version")
    if (!auth.ok) return auth.response
    const version = await getVersion(auth.supabase, auth.id, auth.childId)
    return version ? ok(version) : fail(404, "not_found", "Version not found.")
}

export async function POST (request: Request, context: NestedContext) {
    const auth = await authWithChild(request, context, "Version")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.supabase
        .from("resume_versions")
        .update({ name: parsed.data.name })
        .eq("resume_id", auth.id)
        .eq("id", auth.childId)
        .select("id")
    if (error) return dbError(error, "rename version")
    if (!data?.length) return fail(404, "not_found", "Version not found.")
    return ok({ id: auth.childId, name: parsed.data.name })
}
