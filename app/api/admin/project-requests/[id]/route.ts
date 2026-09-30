import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { projectRequestUpdateSchema } from "@/lib/admin/page-schemas"
import { getProjectRequest } from "@/lib/admin/page-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

const notFound = () => fail(404, "not_found", "Inquiry not found.")

export async function GET (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return notFound()

    const row = await getProjectRequest(auth.ctx.supabase, id.data)
    return row ? ok(row) : notFound()
}

// Only status and internal notes can change; the visitor's answers are read-only.
export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return notFound()

    const parsed = await parseJson(request, projectRequestUpdateSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase.from("project_requests").update(parsed.data).eq("id", id.data).select("id")
    if (error) return dbError(error, "update project_requests")
    if (!data?.length) return notFound()
    return ok({ id: id.data, ...parsed.data })
}
