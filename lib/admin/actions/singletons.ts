import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { blogPageInputSchema } from "@/lib/admin/blog-schemas"
import { getBlogPageForAdmin } from "@/lib/admin/blog-queries"
import { aboutPageInputSchema, galleryPageInputSchema, projectFormInputSchema } from "@/lib/admin/page-schemas"
import { getAboutForAdmin, getGalleryForAdmin, getProjectFormForAdmin } from "@/lib/admin/page-queries"
import { revalidateAbout, revalidateBlog, revalidateGallery, revalidateProjectForm } from "@/lib/admin/revalidate"
import { dbFailure, failure, success, type ActionResult } from "@/lib/admin/actions/result"

// Single-row page tables (id = 1). The row is created by the seed; updates never accept
// an id, and a missing row is reported instead of silently inserted.

export type SingletonConfig = {
    table: "about_page" | "gallery_page" | "project_form_settings" | "blog_page"
    label: string
    inputSchema: z.ZodType<Record<string, unknown>>
    get: (supabase: SupabaseClient) => Promise<Record<string, unknown>>
    revalidate: () => void
}

export const aboutPageConfig: SingletonConfig = {
    table: "about_page",
    label: "About page",
    inputSchema: aboutPageInputSchema,
    get: getAboutForAdmin,
    revalidate: revalidateAbout,
}

export const galleryPageConfig: SingletonConfig = {
    table: "gallery_page",
    label: "Gallery page",
    inputSchema: galleryPageInputSchema,
    get: getGalleryForAdmin,
    revalidate: revalidateGallery,
}

export const blogPageConfig: SingletonConfig = {
    table: "blog_page",
    label: "Blog page",
    inputSchema: blogPageInputSchema,
    get: getBlogPageForAdmin,
    revalidate: revalidateBlog,
}

export const projectFormConfig: SingletonConfig = {
    table: "project_form_settings",
    label: "Project form settings",
    inputSchema: projectFormInputSchema,
    get: getProjectFormForAdmin,
    revalidate: revalidateProjectForm,
}

// `input` must already be parsed with config.inputSchema.
export async function updateSingleton (supabase: SupabaseClient, config: SingletonConfig, input: Record<string, unknown>): Promise<ActionResult<{ saved: true }>> {
    const { data, error } = await supabase.from(config.table).update(input).eq("id", 1).select("id")
    if (error) return dbFailure(error, `update ${config.table}`)
    if (!data?.length) return failure(404, "not_seeded", `${config.label} row is missing. Run the matching seed file in supabase/ first.`)

    config.revalidate()
    return success({ saved: true })
}
