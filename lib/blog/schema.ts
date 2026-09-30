import { z } from "zod"
import { publicImageUrl } from "@/lib/storage"
import type { BlogDoc } from "@/lib/blog/content"

// Client-safe read schemas, defaults and display helpers for the blog.

export const BLOG_CACHE_TAG = "blog"
export const POSTS_PER_PAGE = 12

export const BLOG_PAGE_COLUMNS = "badge, title, highlight, intro, substack_url, cta_title, cta_label"

export const blogPageRowSchema = z.object({
    badge: z.string(),
    title: z.string(),
    highlight: z.string(),
    intro: z.string(),
    substack_url: z.string().nullable(),
    cta_title: z.string(),
    cta_label: z.string(),
})

export type BlogPageRow = z.infer<typeof blogPageRowSchema>

export const DEFAULT_BLOG_PAGE: BlogPageRow = {
    badge: "Blog ✍️",
    title: "Thoughts, ideas &",
    highlight: "everything in between.",
    intro: "Welcome to my digital garden. This is where I share my experiences, lessons learned, and insights on design, code, and building products.",
    substack_url: null,
    cta_title: "Ready to create something huge?",
    cta_label: "Let's Work",
}

export const POST_CARD_COLUMNS = "id, slug, title, excerpt, auto_excerpt, reading_minutes, published_at"

// excerpt = the author's own summary; auto_excerpt = the first words of the body (set on save).
export const postCardSchema = z
    .object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        excerpt: z.string().nullable(),
        auto_excerpt: z.string(),
        reading_minutes: z.number().int(),
        published_at: z.string(),
    })
    .transform(({ auto_excerpt, ...row }) => ({ ...row, summary: row.excerpt || auto_excerpt }))

export type PostCard = z.infer<typeof postCardSchema>

export const POST_COLUMNS = `${POST_CARD_COLUMNS}, content, cover_path, seo_description, canonical_url, updated_at`

export const postSchema = z
    .object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        excerpt: z.string().nullable(),
        auto_excerpt: z.string(),
        reading_minutes: z.number().int(),
        published_at: z.string(),
        content: z.custom<BlogDoc>(value => typeof value === "object" && value !== null && (value as { type?: unknown }).type === "doc"),
        cover_path: z.string().nullable(),
        seo_description: z.string().nullable(),
        canonical_url: z.string().nullable(),
        updated_at: z.string(),
    })
    .transform(({ auto_excerpt, ...row }) => ({
        ...row,
        summary: row.excerpt || auto_excerpt,
        coverUrl: publicImageUrl("site-images", row.cover_path),
    }))

export type Post = z.infer<typeof postSchema>

// "Sep 15, 2026". UTC so the server-rendered date never shifts by a day.
export function formatPostDate (iso: string) {
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export function readTimeLabel (minutes: number) {
    return `${minutes} min read`
}
