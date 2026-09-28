import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Technology not found.")

    const { count, error: countError } = await supabase
        .from("project_technologies")
        .select("project_id", { count: "exact", head: true })
        .eq("technology_id", id.data)
    if (countError) return dbError(countError, "count technology usage")
    if (count) return fail(409, "in_use", `In use by ${count} project${count === 1 ? "" : "s"}. Remove it from those projects first.`)

    const { data, error } = await supabase
        .from("technologies")
        .delete()
        .eq("id", id.data)
        .select("icon_path")
        .maybeSingle()
    if (error) return dbError(error, "delete technology")
    if (!data) return fail(404, "not_found", "Technology not found.")

    if (data.icon_path) {
        const { error: storageError } = await supabase.storage.from("tech-icons").remove([data.icon_path])
        if (storageError) console.error("[admin] tech icon cleanup failed:", storageError.message)
    }

    revalidateProjects()
    return ok({ id: id.data, deleted: true })
}
