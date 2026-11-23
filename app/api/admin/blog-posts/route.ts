import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { listPostsForAdmin } from "@/lib/admin/blog-queries"
import { blogPostInputSchema } from "@/lib/admin/blog-schemas"
import { createPost } from "@/lib/admin/actions/records"
import { toResponse } from "@/lib/admin/actions/result"

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

    return toResponse(await createPost(auth.ctx.supabase, parsed.data), 201)
}
