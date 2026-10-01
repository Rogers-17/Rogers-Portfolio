import { z } from "zod"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { getResume } from "@/lib/resume/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"
import { TEMPLATES, designSchema, parseResumeData } from "@/lib/resume/schema"
import { listVersions, snapshotResume } from "@/lib/resume/versions"

// GET: version list. POST: save a named version, either of the saved resume or of the
// editor state you send (used before restoring an older version, so it can be undone).

const bodySchema = z.object({
    name: z.string().trim().min(1, "Give the version a name").max(80),
    state: z.object({
        title: z.string().trim().min(1).max(120),
        template: z.enum(TEMPLATES),
        design: designSchema,
        data: z.unknown(),
    }).optional(),
})

export async function GET (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    return ok(await listVersions(auth.supabase, auth.id))
}

export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response

    const resume = await getResume(auth.supabase, auth.id)
    if (!resume) return fail(404, "not_found", "Resume not found.")

    let snapshot = { title: resume.title, template: resume.template, design: resume.design, data: resume.data }
    if (parsed.data.state) {
        const document = parseResumeData(parsed.data.state.data)
        if (!document.ok) return fail(400, "validation_error", document.message)
        snapshot = { ...parsed.data.state, data: document.data }
    }

    const id = await snapshotResume(auth.supabase, auth.id, snapshot, parsed.data.name)
    return ok({ id }, 201)
}
