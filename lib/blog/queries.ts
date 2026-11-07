import "server-only"
import { cache } from "react"
import { z } from "zod"
import type { PostgrestError } from "@supabase/supabase-js"
import { createServerSupabase } from "@/lib/supabase/server"
import {
    BLOG_CACHE_TAG,
    BLOG_PAGE_COLUMNS,
    DEFAULT_BLOG_PAGE,
    POSTS_PER_PAGE,
    POST_CARD_COLUMNS,
    POST_COLUMNS,
    blogPageRowSchema,
    postCardSchema,
    postSchema,
    type BlogPageRow,
    type Post,
    type PostCard,
} from "@/lib/blog/schema"

// RLS only returns published posts whose publish date has passed, so drafts and
// scheduled posts can't leak. Before the Phase 5 migration, fall back to empty/defaults.

const isMissingTable = (error: PostgrestError) => error.code === "PGRST205" || error.code === "42P01"

function handle (error: PostgrestError, what: string) {
    if (isMissingTable(error)) {
        console.warn(`[blog] ${what}: table missing, using defaults. Run the Phase 5 migration.`)
        return
    }
    throw new Error(`Failed to load ${what}: ${error.message}`)
}

export const getBlogPage = cache(async (): Promise<BlogPageRow> => {
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG).from("blog_page").select(BLOG_PAGE_COLUMNS).eq("id", 1).maybeSingle()
    if (error) handle(error, "blog page")
    return data ? blogPageRowSchema.parse(data) : DEFAULT_BLOG_PAGE
})

export const getPublishedPosts = cache(async (page = 1): Promise<{ posts: PostCard[], hasMore: boolean }> => {
    const from = (page - 1) * POSTS_PER_PAGE
    // Fetch one extra row to know whether there is a next page.
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG)
        .from("blog_posts")
        .select(POST_CARD_COLUMNS)
        .order("published_at", { ascending: false })
        .range(from, from + POSTS_PER_PAGE)

    if (error) {
        handle(error, "blog posts")
        return { posts: [], hasMore: false }
    }
    const rows = z.array(postCardSchema).parse(data)
    return { posts: rows.slice(0, POSTS_PER_PAGE), hasMore: rows.length > POSTS_PER_PAGE }
})

export const getPublishedPost = cache(async (slug: string): Promise<Post | null> => {
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG).from("blog_posts").select(POST_COLUMNS).eq("slug", slug).maybeSingle()
    if (error) {
        handle(error, "blog post")
        return null
    }
    return data ? postSchema.parse(data) : null
})

export async function getPublishedSlugs (): Promise<string[]> {
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG).from("blog_posts").select("slug").limit(1000)
    if (error) {
        handle(error, "blog slugs")
        return []
    }
    return z.array(z.object({ slug: z.string() })).parse(data).map(row => row.slug)
}

// Up to `limit` newest published posts other than `excludeSlug` (related links under a post).
export const getRecentPosts = cache(async (excludeSlug: string, limit = 3): Promise<PostCard[]> => {
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG)
        .from("blog_posts")
        .select(POST_CARD_COLUMNS)
        .neq("slug", excludeSlug)
        .order("published_at", { ascending: false })
        .limit(limit)

    if (error) {
        handle(error, "recent blog posts")
        return []
    }
    return z.array(postCardSchema).parse(data)
})

// Published posts for app/sitemap.ts (RLS hides drafts and scheduled posts).
export async function getSitemapPosts (): Promise<{ slug: string, updated_at: string, canonical_url: string | null }[]> {
    const { data, error } = await createServerSupabase(BLOG_CACHE_TAG)
        .from("blog_posts")
        .select("slug, updated_at, canonical_url")
        .order("published_at", { ascending: false })
        .limit(1000)

    if (error) {
        handle(error, "sitemap blog posts")
        return []
    }
    return z.array(z.object({ slug: z.string(), updated_at: z.string(), canonical_url: z.string().nullable() })).parse(data)
}
