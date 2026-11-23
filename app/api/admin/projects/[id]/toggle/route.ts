import { requireAdminApi } from "@/lib/admin/auth"
import { fail, parseJson } from "@/lib/admin/http"
import { toggleSchema, uuidSchema } from "@/lib/admin/schemas"
import { toggleProject } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    const parsed = await parseJson(request, toggleSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await toggleProject(auth.ctx.supabase, id.data, parsed.data.field, parsed.data.value))
}
