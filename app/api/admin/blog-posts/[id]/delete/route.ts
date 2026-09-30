import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"
import { revalidateBlog } from "@/lib/admin/revalidate"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

// Uploaded images are kept in storage: they may be reused by other posts.
export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return fail(404, "not_found", "Post not found.")

    const { data, error } = await auth.ctx.supabase.from("blog_posts").delete().eq("id", id.data).select("id")
    if (error) return dbError(error, "delete blog_posts")
    if (!data?.length) return fail(404, "not_found", "Post not found.")

    revalidateBlog()
    return ok({ id: id.data, deleted: true })
}
