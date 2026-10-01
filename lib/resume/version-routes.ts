import "server-only"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"

export type NestedContext = { params: Promise<{ id: string, childId: string }> }

// Auth + validation for /api/admin/resumes/[id]/<collection>/[childId] routes.
export async function authWithChild (request: Request, context: NestedContext, label: string) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return { ok: false as const, response: auth.response }
    const params = await context.params
    const id = uuidSchema.safeParse(params.id)
    const childId = uuidSchema.safeParse(params.childId)
    if (!id.success || !childId.success) return { ok: false as const, response: fail(404, "not_found", `${label} not found.`) }
    return { ok: true as const, supabase: auth.ctx.supabase, id: id.data, childId: childId.data }
}
