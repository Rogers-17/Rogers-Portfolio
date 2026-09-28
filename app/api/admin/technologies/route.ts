import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { listTechnologiesForAdmin } from "@/lib/admin/queries"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { technologyInputSchema } from "@/lib/admin/schemas"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    return ok(await listTechnologiesForAdmin(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, technologyInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase
        .from("technologies")
        .insert(parsed.data)
        .select("id, name, slug, icon_path")
        .single()
    if (error) return dbError(error, "create technology")

    revalidateProjects()
    return ok(data, 201)
}
