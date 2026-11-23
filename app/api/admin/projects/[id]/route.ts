import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { getProjectForAdmin } from "@/lib/admin/queries"
import { projectInputSchema, uuidSchema } from "@/lib/admin/schemas"
import { saveProject } from "@/lib/admin/actions/projects"
import { toResponse } from "@/lib/admin/actions/result"

type Context = { params: Promise<{ id: string }> }

export async function GET (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    const project = await getProjectForAdmin(auth.ctx.supabase, id.data)
    return project ? ok(project) : fail(404, "not_found", "Project not found.")
}

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    const parsed = await parseJson(request, projectInputSchema)
    if (!parsed.success) return parsed.response

    return toResponse(await saveProject(auth.ctx.supabase, id.data, parsed.data))
}
