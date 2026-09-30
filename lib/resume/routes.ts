import "server-only"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"

export type IdContext = { params: Promise<{ id: string }> }

// Auth + UUID check shared by the resume and cover-letter item routes.
export async function authWithId (request: Request, context: IdContext, label: string) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return { ok: false as const, response: auth.response }
    const id = uuidSchema.safeParse((await context.params).id)
    if (!id.success) return { ok: false as const, response: fail(404, "not_found", `${label} not found.`) }
    return { ok: true as const, supabase: auth.ctx.supabase, id: id.data }
}
