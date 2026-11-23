import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { getPostForAdmin } from "@/lib/admin/blog-queries"
import { blogPostInputSchema } from "@/lib/admin/blog-schemas"
import { uuidSchema } from "@/lib/admin/schemas"
import { updatePost } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

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

    return toResponse(await updatePost(auth.ctx.supabase, id.data, parsed.data))
}
