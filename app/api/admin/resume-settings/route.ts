import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getResumeSettings } from "@/lib/resume/queries"
import { TEMPLATES } from "@/lib/resume/schema"

const resumeSettingsSchema = z.object({
    ai_model: z.string().trim().max(100).regex(/^[a-z0-9._-]+\/[a-z0-9._:-]+$/, "Use an OpenRouter model ID like anthropic/claude-haiku-4.5"),
    daily_ai_limit: z.number().int().min(1, "At least 1").max(2000, "Max 2000"),
    default_template: z.enum(TEMPLATES),
})

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await getResumeSettings(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, resumeSettingsSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase.from("resume_settings").update(parsed.data).eq("id", 1).select("id")
    if (error) return dbError(error, "update resume settings")
    if (!data?.length) return fail(404, "not_seeded", "Settings row is missing. Run the Phase 6 migration.")
    return ok({ saved: true })
}
