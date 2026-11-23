import "server-only"
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { BlogPostInput } from "@/lib/admin/blog-schemas"
import { revalidateBlog } from "@/lib/admin/revalidate"
import type { z } from "zod"
import type { projectRequestUpdateSchema } from "@/lib/admin/page-schemas"
import { autoExcerpt, readingMinutes, toPlainText } from "@/lib/blog/content"
import type { JobInput } from "@/lib/jobs/schema"
import { dbFailure, failure, notFound, success, type ActionFailure, type ActionResult } from "@/lib/admin/actions/result"

// Blog posts, job applications and inquiries: shared by the admin API routes and the AI assistant.

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

// Values derived from the body on every save (the client never sets them).
export function toPostRow (input: BlogPostInput) {
    const text = toPlainText(input.content)
    return {
        ...input,
        content_text: text.slice(0, 200_000),
        auto_excerpt: autoExcerpt(text),
        reading_minutes: readingMinutes(text),
    }
}

function postDbFailure (error: PostgrestError, context: string): ActionFailure {
    if (error.code === "23505") return failure(409, "conflict", "Slug already in use.", [{ path: "slug", message: "Slug already in use" }])
    return dbFailure(error, context)
}

export async function createPost (supabase: SupabaseClient, input: BlogPostInput): Promise<ActionResult<{ id: string }>> {
    const { data, error } = await supabase.from("blog_posts").insert(toPostRow(input)).select("id").single()
    if (error) return postDbFailure(error, "create blog_posts")

    revalidateBlog()
    return success({ id: data.id as string })
}

export async function updatePost (supabase: SupabaseClient, id: string, input: BlogPostInput): Promise<ActionResult<{ id: string }>> {
    const { data, error } = await supabase.from("blog_posts").update(toPostRow(input)).eq("id", id).select("id")
    if (error) return postDbFailure(error, "update blog_posts")
    if (!data?.length) return notFound("Post")

    revalidateBlog()
    return success({ id })
}

// Uploaded images are kept in storage: they may be reused by other posts.
export async function deletePost (supabase: SupabaseClient, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    const { data, error } = await supabase.from("blog_posts").delete().eq("id", id).select("id")
    if (error) return dbFailure(error, "delete blog_posts")
    if (!data?.length) return notFound("Post")

    revalidateBlog()
    return success({ id, deleted: true })
}

// ---------------------------------------------------------------------------
// Job applications
// ---------------------------------------------------------------------------

// New applications go to the top of their status column.
export async function createJob (supabase: SupabaseClient, input: JobInput): Promise<ActionResult<{ id: string }>> {
    const { data: first } = await supabase
        .from("job_applications")
        .select("sort_order")
        .eq("status", input.status)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle()

    const { data, error } = await supabase
        .from("job_applications")
        .insert({ ...input, sort_order: (first?.sort_order ?? 1) - 1 })
        .select("id")
        .single()
    if (error) return dbFailure(error, "create application")
    return success({ id: data.id as string })
}

export async function updateJob (supabase: SupabaseClient, id: string, input: JobInput): Promise<ActionResult<{ id: string, status_changed_at: string }>> {
    const { data, error } = await supabase.from("job_applications").update(input).eq("id", id).select("id, status_changed_at")
    if (error) return dbFailure(error, "update application")
    if (!data?.length) return notFound("Application")
    return success({ id, status_changed_at: data[0].status_changed_at as string })
}

export async function deleteJob (supabase: SupabaseClient, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    const { data, error } = await supabase.from("job_applications").delete().eq("id", id).select("id")
    if (error) return dbFailure(error, "delete application")
    if (!data?.length) return notFound("Application")
    return success({ id, deleted: true })
}

// ---------------------------------------------------------------------------
// Inquiries (project requests): only status and internal notes can change.
// ---------------------------------------------------------------------------

export type InquiryUpdate = z.infer<typeof projectRequestUpdateSchema>

export async function updateInquiry (supabase: SupabaseClient, id: string, input: InquiryUpdate): Promise<ActionResult<{ id: string } & InquiryUpdate>> {
    const { data, error } = await supabase.from("project_requests").update(input).eq("id", id).select("id")
    if (error) return dbFailure(error, "update project_requests")
    if (!data?.length) return notFound("Inquiry")
    return success({ id, ...input })
}

export async function deleteInquiry (supabase: SupabaseClient, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    const { data, error } = await supabase.from("project_requests").delete().eq("id", id).select("id")
    if (error) return dbFailure(error, "delete project_requests")
    if (!data?.length) return notFound("Inquiry")
    return success({ id, deleted: true })
}
