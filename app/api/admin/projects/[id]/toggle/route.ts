import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { toggleSchema, uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    const parsed = await parseJson(request, toggleSchema)
    if (!parsed.success) return parsed.response
    const { field, value } = parsed.data

    const { data, error } = await auth.ctx.supabase
        .from("projects")
        .update({ [field]: value })
        .eq("id", id.data)
        .select("id")
    if (error) return dbError(error, "toggle project")
    if (!data?.length) return fail(404, "not_found", "Project not found.")

    revalidateProjects()
    return ok({ id: id.data, [field]: value })
}
