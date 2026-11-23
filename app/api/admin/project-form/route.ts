import { singletonHandlers } from "@/lib/admin/page-routes"
import { projectFormConfig } from "@/lib/admin/actions/singletons"

export const { GET, POST } = singletonHandlers(projectFormConfig)
