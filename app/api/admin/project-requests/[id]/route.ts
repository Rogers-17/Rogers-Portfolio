import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { projectRequestUpdateSchema } from "@/lib/admin/page-schemas"
import { getProjectRequest } from "@/lib/admin/page-queries"
import { uuidSchema } from "@/lib/admin/schemas"
import { updateInquiry } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

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

    return toResponse(await updateInquiry(auth.ctx.supabase, id.data, parsed.data))
}
