import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { experienceInputSchema, testimonialInputSchema } from "@/lib/admin/content-schemas"
import { getExperienceForAdmin, getTestimonialForAdmin, listExperiencesForAdmin, listTestimonialsForAdmin } from "@/lib/admin/content-queries"
import { aboutFactInputSchema, galleryPhotoInputSchema } from "@/lib/admin/page-schemas"
import { getAboutFactForAdmin, getGalleryPhotoForAdmin, listAboutFactsForAdmin, listGalleryPhotosForAdmin } from "@/lib/admin/page-queries"
import { revalidateAbout, revalidateExperiences, revalidateGallery, revalidateTestimonials } from "@/lib/admin/revalidate"
import { dbFailure, notFound, success, type ActionResult } from "@/lib/admin/actions/result"

// Flat content tables (testimonials, experiences, about facts, gallery photos):
// shared by the admin API routes and the AI assistant.

export type ContentConfig = {
    table: "testimonials" | "experiences" | "about_facts" | "gallery_photos"
    label: string
    inputSchema: z.ZodType<Record<string, unknown>>
    // Storage object (site-images) removed together with the row, if any.
    imageColumn?: "avatar_path" | "logo_path" | "image_path"
    list: (supabase: SupabaseClient) => Promise<unknown[]>
    get: (supabase: SupabaseClient, id: string) => Promise<unknown | null>
    revalidate: () => void
}

export const testimonialsConfig: ContentConfig = {
    table: "testimonials",
    label: "Testimonial",
    inputSchema: testimonialInputSchema,
    imageColumn: "avatar_path",
    list: listTestimonialsForAdmin,
    get: getTestimonialForAdmin,
    revalidate: revalidateTestimonials,
}

export const experiencesConfig: ContentConfig = {
    table: "experiences",
    label: "Experience",
    inputSchema: experienceInputSchema,
    imageColumn: "logo_path",
    list: listExperiencesForAdmin,
    get: getExperienceForAdmin,
    revalidate: revalidateExperiences,
}

export const aboutFactsConfig: ContentConfig = {
    table: "about_facts",
    label: "Fact",
    inputSchema: aboutFactInputSchema,
    list: listAboutFactsForAdmin,
    get: getAboutFactForAdmin,
    revalidate: revalidateAbout,
}

export const galleryPhotosConfig: ContentConfig = {
    table: "gallery_photos",
    label: "Photo",
    inputSchema: galleryPhotoInputSchema,
    imageColumn: "image_path",
    list: listGalleryPhotosForAdmin,
    get: getGalleryPhotoForAdmin,
    revalidate: revalidateGallery,
}

// `input` must already be parsed with config.inputSchema.
export async function createContent (supabase: SupabaseClient, config: ContentConfig, input: Record<string, unknown>): Promise<ActionResult<{ id: string }>> {
    // Append new rows to the end of the manual order.
    const { data: last, error: lastError } = await supabase
        .from(config.table)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle()
    if (lastError) return dbFailure(lastError, `read ${config.table} order`)

    const { data, error } = await supabase
        .from(config.table)
        .insert({ ...input, sort_order: (last?.sort_order ?? 0) + 1 })
        .select("id")
        .single()
    if (error) return dbFailure(error, `create ${config.table}`)

    config.revalidate()
    return success({ id: data.id as string })
}

export async function updateContent (supabase: SupabaseClient, config: ContentConfig, id: string, input: Record<string, unknown>): Promise<ActionResult<{ id: string }>> {
    const { data, error } = await supabase.from(config.table).update(input).eq("id", id).select("id")
    if (error) return dbFailure(error, `update ${config.table}`)
    if (!data?.length) return notFound(config.label)

    config.revalidate()
    return success({ id })
}

export async function deleteContent (supabase: SupabaseClient, config: ContentConfig, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    const { data, error } = await supabase
        .from(config.table)
        .delete()
        .eq("id", id)
        .select(config.imageColumn ?? "id")
        .maybeSingle()
    if (error) return dbFailure(error, `delete ${config.table}`)
    if (!data) return notFound(config.label)

    const imagePath = config.imageColumn ? (data as Record<string, string | null>)[config.imageColumn] : null
    if (imagePath) {
        const { error: storageError } = await supabase.storage.from("site-images").remove([imagePath])
        if (storageError) console.error(`[admin] ${config.table} image cleanup failed:`, storageError.message)
    }

    config.revalidate()
    return success({ id, deleted: true })
}

export async function toggleContent (supabase: SupabaseClient, config: ContentConfig, id: string, value: boolean): Promise<ActionResult<{ id: string, is_published: boolean }>> {
    const { data, error } = await supabase.from(config.table).update({ is_published: value }).eq("id", id).select("id")
    if (error) return dbFailure(error, `toggle ${config.table}`)
    if (!data?.length) return notFound(config.label)

    config.revalidate()
    return success({ id, is_published: value })
}

export async function reorderContent (supabase: SupabaseClient, config: ContentConfig, ids: string[]): Promise<ActionResult<{ reordered: number }>> {
    const { error } = await supabase.rpc("admin_reorder_rows", { p_table: config.table, ids })
    if (error) return dbFailure(error, `reorder ${config.table}`)

    config.revalidate()
    return success({ reordered: ids.length })
}
