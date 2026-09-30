import { singletonHandlers } from "@/lib/admin/page-routes"
import { aboutPageInputSchema } from "@/lib/admin/page-schemas"
import { getAboutForAdmin } from "@/lib/admin/page-queries"
import { revalidateAbout } from "@/lib/admin/revalidate"

export const { GET, POST } = singletonHandlers({
    table: "about_page",
    label: "About page",
    inputSchema: aboutPageInputSchema,
    get: getAboutForAdmin,
    revalidate: revalidateAbout,
})
