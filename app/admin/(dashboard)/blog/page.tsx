import Link from "next/link"
import { FiPlus } from "react-icons/fi"
import BlogPageForm from "@/components/admin/BlogPageForm"
import BlogPostsList from "@/components/admin/BlogPostsList"
import { primaryButtonClass } from "@/components/admin/Field"
import SeedNotice from "@/components/admin/SeedNotice"
import { requireAdminPage } from "@/lib/admin/auth"
import { getBlogPageForAdmin, listPostsForAdmin } from "@/lib/admin/blog-queries"

export default async function AdminBlogPage () {
    const { supabase } = await requireAdminPage()
    const [{ exists, ...page }, posts] = await Promise.all([getBlogPageForAdmin(supabase), listPostsForAdmin(supabase)])

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Blog</h1>
                    <p className="mt-1 text-sm text-muted">Posts on /blog, newest publish date first.</p>
                </div>
                <Link href="/admin/blog/new" className={primaryButtonClass}>
                    <FiPlus aria-hidden="true" />
                    New post
                </Link>
            </div>
            <SeedNotice show={!exists} />
            <BlogPostsList posts={posts} now={new Date().toISOString()} />
            <div className="mt-10">
                <BlogPageForm page={page} />
            </div>
        </>
    )
}
