import type { Metadata } from "next"
import Link from "next/link"
import { LuArrowRight, LuBookmark } from "react-icons/lu"
import PostCard from "@/components/blog/PostCard"
import Badge from "@/components/ui/Badge"
import { getBlogPage, getPublishedPosts } from "@/lib/blog/queries"
import LetsWorkCTA from "@/sections/LetsWorkCTA"

export const metadata: Metadata = {
    title: "Blog | Rogers Portfolio",
    description: "Thoughts, ideas and lessons on design, code and building products.",
}

type Props = { searchParams: Promise<{ page?: string }> }

const container = "mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20"

export default async function BlogPage ({ searchParams }: Props) {
    const rawPage = Number((await searchParams).page ?? 1)
    const pageNumber = Number.isInteger(rawPage) && rawPage > 0 && rawPage < 1000 ? rawPage : 1
    const [page, { posts, hasMore }] = await Promise.all([getBlogPage(), getPublishedPosts(pageNumber)])

    return (
        <main className="bg-surface">
            <section className={`${container} pt-10 md:pt-14`}>
                <Badge>{page.badge}</Badge>
                <h1 className="mt-5 text-3xl leading-tight font-bold md:text-4xl lg:text-[2.5rem]">
                    {page.title}
                    <br />
                    <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">{page.highlight}</span>
                </h1>
                <p className="mt-5 max-w-136 text-[15px] leading-relaxed text-fg/85 md:text-base">{page.intro}</p>
                {page.substack_url && (
                    <a href={page.substack_url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:underline">
                        <LuBookmark className="size-4 fill-current" aria-hidden="true" />
                        Follow me on Substack
                    </a>
                )}
            </section>

            <section className={`${container} pt-12 pb-4 md:pt-14`} aria-label="Articles">
                {posts.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/12 p-10 text-center text-muted">No posts yet. Check back soon.</p>
                ) : (
                    <div className="grid items-start gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                        {posts.map(post => <PostCard key={post.id} post={post} />)}
                    </div>
                )}
                {(hasMore || pageNumber > 1) && (
                    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
                        {pageNumber > 1 && (
                            <Link href={pageNumber === 2 ? "/blog" : `/blog?page=${pageNumber - 1}`} className="inline-flex min-h-11 items-center rounded-full border border-white/12 px-6 text-sm font-semibold hover:border-white/30">
                                Newer posts
                            </Link>
                        )}
                        {hasMore && (
                            <Link href={`/blog?page=${pageNumber + 1}`} className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-6 text-sm font-semibold hover:border-accent-1">
                                Load more
                                <LuArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                        )}
                    </nav>
                )}
            </section>

            <LetsWorkCTA title={page.cta_title} label={page.cta_label} />
        </main>
    )
}
