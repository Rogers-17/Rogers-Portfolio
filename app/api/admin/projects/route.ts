import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { listProjectsForAdmin } from "@/lib/admin/queries"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { projectInputSchema } from "@/lib/admin/schemas"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    return ok(await listProjectsForAdmin(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, projectInputSchema)
    if (!parsed.success) return parsed.response

    const { data: id, error } = await auth.ctx.supabase.rpc("admin_save_project", { p_id: null, payload: parsed.data })
    if (error) return dbError(error, "create project")

    revalidateProjects()
    return ok({ id, slug: parsed.data.slug }, 201)
}
