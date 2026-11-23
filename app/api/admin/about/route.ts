import { singletonHandlers } from "@/lib/admin/page-routes"
import { aboutPageConfig } from "@/lib/admin/actions/singletons"

export const { GET, POST } = singletonHandlers(aboutPageConfig)
