import { notFound } from "next/navigation"
import BlogPostForm from "@/components/admin/BlogPostForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getPostForAdmin } from "@/lib/admin/blog-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditBlogPostPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const post = await getPostForAdmin(supabase, id.data)
    if (!post) notFound()

    return <BlogPostForm key={post.id} post={post} />
}
