import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { listPostsForAdmin } from "@/lib/admin/blog-queries"
import { postDbError, toPostRow } from "@/lib/admin/blog-routes"
import { blogPostInputSchema } from "@/lib/admin/blog-schemas"
import { revalidateBlog } from "@/lib/admin/revalidate"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await listPostsForAdmin(auth.ctx.supabase))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, blogPostInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase.from("blog_posts").insert(toPostRow(parsed.data)).select("id").single()
    if (error) return postDbError(error, "create blog_posts")

    revalidateBlog()
    return ok({ id: data.id }, 201)
}
