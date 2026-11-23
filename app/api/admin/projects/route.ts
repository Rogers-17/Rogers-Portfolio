import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { listProjectsForAdmin } from "@/lib/admin/queries"
import { projectInputSchema } from "@/lib/admin/schemas"
import { saveProject } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    return ok(await listProjectsForAdmin(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, projectInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await saveProject(auth.ctx.supabase, null, parsed.data), 201)
}
