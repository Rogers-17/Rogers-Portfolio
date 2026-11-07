import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu"
import PostCard from "@/components/blog/PostCard"
import RichText from "@/components/blog/RichText"
import JsonLd from "@/components/seo/JsonLd"
import { getBlogPage, getPublishedPost, getPublishedSlugs, getRecentPosts } from "@/lib/blog/queries"
import { blogPostingJsonLd, breadcrumbJsonLd, pageMetadata, safeCanonical } from "@/lib/seo"
import { absoluteUrl } from "@/lib/site"
import { formatPostDate, readTimeLabel } from "@/lib/blog/schema"
import { SLUG_PATTERN } from "@/lib/projects/shared"
import LetsWorkCTA from "@/sections/LetsWorkCTA"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams () {
    return (await getPublishedSlugs()).map(slug => ({ slug }))
}

async function loadPost (slug: string) {
    return SLUG_PATTERN.test(slug) ? getPublishedPost(slug) : null
}

// The dashboard's canonical URL is used only when it is a well-formed http(s) URL that
// points somewhere other than this post; anything else falls back to the post's own URL.
function postSeo (post: NonNullable<Awaited<ReturnType<typeof loadPost>>>) {
    const path = `/blog/${post.slug}`
    const canonical = safeCanonical(post.canonical_url)
    const external = canonical !== null && canonical !== absoluteUrl(path) ? canonical : null
    return { path, external, description: post.seo_description ?? post.summary }
}

export async function generateMetadata ({ params }: Props): Promise<Metadata> {
    const post = await loadPost((await params).slug)
    if (!post) return { title: "Post not found" }

    const { path, external, description } = postSeo(post)
    return pageMetadata({
        title: post.title,
        description,
        path,
        canonical: external ?? undefined,
        image: post.coverUrl ? { url: post.coverUrl, alt: post.title } : null,
        type: "article",
        article: { publishedTime: post.published_at, modifiedTime: post.updated_at },
    })
}

function hostOf (url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, "")
    } catch {
        return url
    }
}

export default async function BlogPostPage ({ params }: Props) {
    const post = await loadPost((await params).slug)
    if (!post) notFound()
    const [page, related] = await Promise.all([getBlogPage(), getRecentPosts(post.slug, 3)])
    const { path, external, description } = postSeo(post)

    return (
        <main className="bg-surface">
            <article className="mx-auto w-full max-w-160 px-5 pt-10 md:pt-14">
                <Link href="/blog" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted transition-colors hover:text-white">
                    <LuArrowLeft className="size-4" aria-hidden="true" />
                    Back to Blog
                </Link>
                <h1 className="mt-6 text-3xl leading-[1.15] font-bold text-white md:text-[2.75rem]">{post.title}</h1>
                <p className="mt-4 text-xs text-dim md:text-sm">
                    <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
                    <span className="mx-2" aria-hidden="true">•</span>
                    {readTimeLabel(post.reading_minutes)}
                </p>

                <RichText doc={post.content} className="mt-10" />

                {external && (
                    <p className="mt-12 border-t border-white/8 pt-6 text-sm text-muted">
                        Originally published on{" "}
                        <a href={external} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-1 hover:underline">
                            {hostOf(external)}
                            <LuArrowUpRight className="size-3.5" aria-hidden="true" />
                        </a>
                    </p>
                )}
            </article>

            {related.length > 0 && (
                <section className="mx-auto w-full px-5 pt-20 pb-4 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20" aria-labelledby="more-articles-heading">
                    <h2 id="more-articles-heading" className="text-2xl font-bold md:text-3xl">More articles</h2>
                    <div className="mt-8 grid items-start gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                        {related.map(item => <PostCard key={item.id} post={item} headingLevel="h3" />)}
                    </div>
                </section>
            )}

            <JsonLd nodes={[
                blogPostingJsonLd({ path, title: post.title, description, publishedAt: post.published_at, modifiedAt: post.updated_at, imageUrl: post.coverUrl }),
                breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path }]),
            ]} />
            <LetsWorkCTA title={page.cta_title} label={page.cta_label} />
        </main>
    )
}
