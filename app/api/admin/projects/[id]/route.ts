import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { getProjectForAdmin } from "@/lib/admin/queries"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { projectInputSchema, uuidSchema } from "@/lib/admin/schemas"

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

    const { error } = await auth.ctx.supabase.rpc("admin_save_project", { p_id: id.data, payload: parsed.data })
    if (error) return dbError(error, "update project")

    revalidateProjects()
    return ok({ id: id.data, slug: parsed.data.slug })
}
