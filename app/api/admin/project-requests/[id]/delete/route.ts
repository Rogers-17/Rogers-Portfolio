import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return fail(404, "not_found", "Inquiry not found.")

    const { data, error } = await auth.ctx.supabase.from("project_requests").delete().eq("id", id.data).select("id")
    if (error) return dbError(error, "delete project_requests")
    if (!data?.length) return fail(404, "not_found", "Inquiry not found.")
    return ok({ id: id.data, deleted: true })
}
