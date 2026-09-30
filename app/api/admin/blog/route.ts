import { singletonHandlers } from "@/lib/admin/page-routes"
import { blogPageInputSchema } from "@/lib/admin/blog-schemas"
import { getBlogPageForAdmin } from "@/lib/admin/blog-queries"
import { revalidateBlog } from "@/lib/admin/revalidate"

export const { GET, POST } = singletonHandlers({
    table: "blog_page",
    label: "Blog page",
    inputSchema: blogPageInputSchema,
    get: getBlogPageForAdmin,
    revalidate: revalidateBlog,
})
