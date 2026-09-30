import { singletonHandlers } from "@/lib/admin/page-routes"
import { galleryPageInputSchema } from "@/lib/admin/page-schemas"
import { getGalleryForAdmin } from "@/lib/admin/page-queries"
import { revalidateGallery } from "@/lib/admin/revalidate"

export const { GET, POST } = singletonHandlers({
    table: "gallery_page",
    label: "Gallery page",
    inputSchema: galleryPageInputSchema,
    get: getGalleryForAdmin,
    revalidate: revalidateGallery,
})
