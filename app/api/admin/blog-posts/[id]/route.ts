import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { getPostForAdmin } from "@/lib/admin/blog-queries"
import { postDbError, toPostRow } from "@/lib/admin/blog-routes"
import { blogPostInputSchema } from "@/lib/admin/blog-schemas"
import { revalidateBlog } from "@/lib/admin/revalidate"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

const notFound = () => fail(404, "not_found", "Post not found.")

export async function GET (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return notFound()

    const post = await getPostForAdmin(auth.ctx.supabase, id.data)
    return post ? ok(post) : notFound()
}

export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return notFound()

    const parsed = await parseJson(request, blogPostInputSchema)
    if (!parsed.success) return parsed.response

    const { data, error } = await auth.ctx.supabase.from("blog_posts").update(toPostRow(parsed.data)).eq("id", id.data).select("id")
    if (error) return postDbError(error, "update blog_posts")
    if (!data?.length) return notFound()

    revalidateBlog()
    return ok({ id: id.data })
}
