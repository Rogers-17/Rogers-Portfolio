import { requireAdminApi } from "@/lib/admin/auth"
import { fail } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"
import { deleteTechnology } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Technology not found.")

    return toResponse(await deleteTechnology(auth.ctx.supabase, id.data))
}
