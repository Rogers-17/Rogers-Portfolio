import BlogPostForm from "@/components/admin/BlogPostForm"
import { requireAdminPage } from "@/lib/admin/auth"

export default async function NewBlogPostPage () {
    await requireAdminPage()
    return <BlogPostForm />
}
