import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { reorderSchema } from "@/lib/admin/schemas"

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, reorderSchema)
    if (!parsed.success) return parsed.response

    const { error } = await auth.ctx.supabase.rpc("admin_reorder_projects", { ids: parsed.data.ids })
    if (error) return dbError(error, "reorder projects")

    revalidateProjects()
    return ok({ reordered: parsed.data.ids.length })
}
