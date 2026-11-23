import { requireAdminApi } from "@/lib/admin/auth"
import { fail } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"
import { deleteInquiry } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return fail(404, "not_found", "Inquiry not found.")

    return toResponse(await deleteInquiry(auth.ctx.supabase, id.data))
}
