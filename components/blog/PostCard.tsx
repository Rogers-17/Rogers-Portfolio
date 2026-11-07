import Link from "next/link"
import { LuArrowRight } from "react-icons/lu"
import { formatPostDate, readTimeLabel, type PostCard as PostCardData } from "@/lib/blog/schema"

// `headingLevel` lets the card sit under an existing <h2> (e.g. "More articles") without breaking the outline.
export default function PostCard ({ post, headingLevel = "h2" }: { post: PostCardData, headingLevel?: "h2" | "h3" }) {
    const Heading = headingLevel
    return (
        <article className="group relative flex flex-col rounded-2xl border border-white/6 bg-white/1.5 p-6 transition-[border-color,box-shadow,background-color] duration-300 hover:border-accent-1/40 hover:bg-white/2.5 hover:shadow-[0_0_40px_-12px_rgba(222,14,255,0.35)] md:p-7">
            <p className="text-xs text-dim">
                <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
                <span className="mx-2" aria-hidden="true">•</span>
                {readTimeLabel(post.reading_minutes)}
            </p>
            <Heading className="mt-4 text-lg leading-snug font-bold text-white md:text-xl">
                {/* The link covers the whole card. */}
                <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-offset-2 after:focus-visible:outline-accent-1">
                    {post.title}
                </Link>
            </Heading>
            {post.summary && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{post.summary}</p>}
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-1" aria-hidden="true">
                Read article
                <LuArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
        </article>
    )
}
