import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { galleryBulkInputSchema } from "@/lib/admin/page-schemas"
import { revalidateGallery } from "@/lib/admin/revalidate"

// Creates several gallery photos at once (after a multi-file upload), appended to the end.
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const parsed = await parseJson(request, galleryBulkInputSchema)
    if (!parsed.success) return parsed.response

    const { data: last, error: lastError } = await supabase
        .from("gallery_photos")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle()
    if (lastError) return dbError(lastError, "read gallery_photos order")

    const start = (last?.sort_order ?? 0) + 1
    const rows = parsed.data.photos.map((photo, index) => ({ ...photo, is_published: true, sort_order: start + index }))
    const { data, error } = await supabase.from("gallery_photos").insert(rows).select("id")
    if (error) return dbError(error, "bulk create gallery_photos")

    revalidateGallery()
    return ok({ ids: data.map(row => row.id) }, 201)
}
