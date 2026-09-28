import { collectionHandlers, experiencesConfig } from "@/lib/admin/content-routes"

export const { GET, POST } = collectionHandlers(experiencesConfig)
