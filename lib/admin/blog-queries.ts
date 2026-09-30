import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { BlogDoc } from "@/lib/blog/content"
import { BLOG_PAGE_COLUMNS, DEFAULT_BLOG_PAGE, blogPageRowSchema, type BlogPageRow } from "@/lib/blog/schema"
import { publicImageUrl } from "@/lib/storage"

// Uncached, per-request reads for the admin (RLS lets admins see drafts and scheduled posts).

function fail (what: string, error: { message: string, code?: string }): never {
    const missing = error.code === "PGRST205" || error.code === "42P01"
    throw new Error(missing
        ? `The ${what} table doesn't exist yet. Run supabase/migrations/20261001000000_blog.sql in the Supabase SQL Editor.`
        : `Failed to load ${what}: ${error.message}`)
}

export async function getBlogPageForAdmin (supabase: SupabaseClient): Promise<BlogPageRow & { exists: boolean }> {
    const { data, error } = await supabase.from("blog_page").select(BLOG_PAGE_COLUMNS).eq("id", 1).maybeSingle()
    if (error) fail("blog_page", error)
    return { ...(data ? blogPageRowSchema.parse(data) : DEFAULT_BLOG_PAGE), exists: Boolean(data) }
}

const listRowSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    status: z.enum(["draft", "published"]),
    published_at: z.string(),
    reading_minutes: z.number(),
    updated_at: z.string(),
})

export type AdminPostListItem = z.infer<typeof listRowSchema>

export async function listPostsForAdmin (supabase: SupabaseClient): Promise<AdminPostListItem[]> {
    const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, status, published_at, reading_minutes, updated_at")
        .order("published_at", { ascending: false })
        .limit(1000)
    if (error) fail("blog_posts", error)
    return z.array(listRowSchema).parse(data)
}

const postRowSchema = listRowSchema.extend({
    excerpt: z.string().nullable(),
    content: z.custom<BlogDoc>(value => typeof value === "object" && value !== null),
    cover_path: z.string().nullable(),
    seo_description: z.string().nullable(),
    canonical_url: z.string().nullable(),
})

export type AdminPost = z.infer<typeof postRowSchema> & { coverUrl: string | null }

export async function getPostForAdmin (supabase: SupabaseClient, id: string): Promise<AdminPost | null> {
    const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, status, published_at, reading_minutes, updated_at, excerpt, content, cover_path, seo_description, canonical_url")
        .eq("id", id)
        .maybeSingle()
    if (error) fail("blog_posts", error)
    if (!data) return null
    const row = postRowSchema.parse(data)
    return { ...row, coverUrl: publicImageUrl("site-images", row.cover_path) }
}
