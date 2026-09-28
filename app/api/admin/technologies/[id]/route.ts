import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { technologyInputSchema, uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Technology not found.")

    const parsed = await parseJson(request, technologyInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase
        .from("technologies")
        .update(parsed.data)
        .eq("id", id.data)
        .select("id, name, slug, icon_path")
        .maybeSingle()
    if (error) return dbError(error, "update technology")
    if (!data) return fail(404, "not_found", "Technology not found.")

    revalidateProjects()
    return ok(data)
}
