import { singletonHandlers } from "@/lib/admin/page-routes"
import { galleryPageConfig } from "@/lib/admin/actions/singletons"

export const { GET, POST } = singletonHandlers(galleryPageConfig)
