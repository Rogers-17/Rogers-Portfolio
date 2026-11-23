import { singletonHandlers } from "@/lib/admin/page-routes"
import { blogPageConfig } from "@/lib/admin/actions/singletons"

export const { GET, POST } = singletonHandlers(blogPageConfig)
