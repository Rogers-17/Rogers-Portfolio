import { requireAdminApi } from "@/lib/admin/auth"
import { fail, parseJson } from "@/lib/admin/http"
import { technologyInputSchema, uuidSchema } from "@/lib/admin/schemas"
import { updateTechnology } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Technology not found.")

    const parsed = await parseJson(request, technologyInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await updateTechnology(auth.ctx.supabase, id.data, parsed.data))
}
