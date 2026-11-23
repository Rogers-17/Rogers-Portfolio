import { requireAdminApi } from "@/lib/admin/auth"
import { fail } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"
import { deleteProject } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    return toResponse(await deleteProject(auth.ctx.supabase, id.data))
}
