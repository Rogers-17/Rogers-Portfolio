import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu"
import RichText from "@/components/blog/RichText"
import { getBlogPage, getPublishedPost, getPublishedSlugs } from "@/lib/blog/queries"
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

export async function generateMetadata ({ params }: Props): Promise<Metadata> {
    const post = await loadPost((await params).slug)
    if (!post) return { title: "Post not found | Rogers Portfolio" }

    const description = post.seo_description ?? post.summary ?? undefined
    return {
        title: `${post.title} | Rogers Portfolio`,
        description,
        alternates: post.canonical_url ? { canonical: post.canonical_url } : undefined,
        openGraph: {
            type: "article",
            title: post.title,
            description,
            publishedTime: post.published_at,
            modifiedTime: post.updated_at,
            images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
        },
    }
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
    const page = await getBlogPage()

    // Structured data for search engines; "<" is escaped so the JSON can't close the script tag.
    const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seo_description ?? post.summary,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        image: post.coverUrl ?? undefined,
        author: { "@type": "Person", name: "Rogers" },
    }).replace(/</g, "\\u003c")

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

                {post.canonical_url && (
                    <p className="mt-12 border-t border-white/8 pt-6 text-sm text-muted">
                        Originally published on{" "}
                        <a href={post.canonical_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-1 hover:underline">
                            {hostOf(post.canonical_url)}
                            <LuArrowUpRight className="size-3.5" aria-hidden="true" />
                        </a>
                    </p>
                )}
            </article>

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
            <LetsWorkCTA title={page.cta_title} label={page.cta_label} />
        </main>
    )
}
