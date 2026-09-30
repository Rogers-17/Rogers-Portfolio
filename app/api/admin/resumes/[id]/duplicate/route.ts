import { z } from "zod"
import { dbError, fail, ok } from "@/lib/admin/http"
import { getResume } from "@/lib/resume/queries"
import { authWithId, type IdContext } from "@/lib/resume/routes"

const bodySchema = z.object({ title: z.string().trim().min(1).max(120).optional() }).catch({})

// Copies a resume (content, template, design, job info). The photo file is shared, not copied.
export async function POST (request: Request, context: IdContext) {
    const auth = await authWithId(request, context, "Resume")
    if (!auth.ok) return auth.response

    const source = await getResume(auth.supabase, auth.id)
    if (!source) return fail(404, "not_found", "Resume not found.")
    const body = bodySchema.parse(await request.json().catch(() => ({})))

    const { data, error } = await auth.supabase
        .from("resumes")
        .insert({
            title: body.title ?? `${source.title} (copy)`.slice(0, 120),
            target_role: source.target_role,
            template: source.template,
            design: source.design,
            data: source.data,
            job_description: source.job_description,
            job_company: source.job_company,
            tailor_keywords: source.tailor_keywords,
        })
        .select("id")
        .single()
    if (error) return dbError(error, "duplicate resume")
    return ok({ id: data.id }, 201)
}
