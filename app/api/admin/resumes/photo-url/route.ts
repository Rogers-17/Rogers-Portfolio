import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { signPhoto } from "@/lib/resume/queries"

const bodySchema = z.object({ path: z.string().regex(/^resumes\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/, "Invalid photo path") })

// Fresh signed URL (1 hour) for a private resume photo.
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response

    const url = await signPhoto(auth.ctx.supabase, parsed.data.path)
    return url ? ok({ url }) : fail(404, "not_found", "Photo not found.")
}
