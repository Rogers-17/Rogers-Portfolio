import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getResumeSettings, listResumes } from "@/lib/resume/queries"
import { DEFAULT_DESIGN, blankResume, parseResumeData, resumeCreateSchema } from "@/lib/resume/schema"

// GET /api/admin/resumes?archived=1
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const archived = new URL(request.url).searchParams.get("archived") === "1"
    return ok(await listResumes(auth.ctx.supabase, archived))
}

// Create a blank resume, or one from provided data (e.g. a reviewed import).
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const parsed = await parseJson(request, resumeCreateSchema)
    if (!parsed.success) return parsed.response

    let data = blankResume()
    if (parsed.data.data !== undefined) {
        const document = parseResumeData(parsed.data.data)
        if (!document.ok) return fail(400, "validation_error", document.message, [{ path: "data", message: document.message }])
        data = document.data
    }

    const template = parsed.data.template ?? (await getResumeSettings(supabase)).default_template
    const { data: row, error } = await supabase
        .from("resumes")
        .insert({ title: parsed.data.title, target_role: parsed.data.target_role, template, design: DEFAULT_DESIGN, data })
        .select("id")
        .single()
    if (error) return dbError(error, "create resume")
    return ok({ id: row.id }, 201)
}
