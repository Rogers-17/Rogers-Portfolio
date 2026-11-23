import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { listTechnologiesForAdmin } from "@/lib/admin/queries"
import { technologyInputSchema } from "@/lib/admin/schemas"
import { createTechnology } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    return ok(await listTechnologiesForAdmin(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, technologyInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await createTechnology(auth.ctx.supabase, parsed.data), 201)
}
