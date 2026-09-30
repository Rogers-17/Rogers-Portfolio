import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { contentToggleSchema, experienceInputSchema, testimonialInputSchema } from "@/lib/admin/content-schemas"
import { getExperienceForAdmin, getTestimonialForAdmin, listExperiencesForAdmin, listTestimonialsForAdmin } from "@/lib/admin/content-queries"
import { aboutFactInputSchema, galleryPhotoInputSchema } from "@/lib/admin/page-schemas"
import { getAboutFactForAdmin, getGalleryPhotoForAdmin, listAboutFactsForAdmin, listGalleryPhotosForAdmin } from "@/lib/admin/page-queries"
import { revalidateAbout, revalidateExperiences, revalidateGallery, revalidateTestimonials } from "@/lib/admin/revalidate"
import { reorderSchema, uuidSchema } from "@/lib/admin/schemas"

// Route handlers shared by simple, flat content tables (testimonials, experiences, about facts, gallery photos).

type ContentConfig = {
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

type Context = { params: Promise<{ id: string }> }

async function parseId (context: Context) {
    return uuidSchema.safeParse((await context.params).id)
}

export function collectionHandlers (config: ContentConfig) {
    return {
        async GET (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            return ok(await config.list(auth.ctx.supabase))
        },

        async POST (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            const { supabase } = auth.ctx

            const parsed = await parseJson(request, config.inputSchema)
            if (!parsed.success) return parsed.response

            // Append new rows to the end of the manual order.
            const { data: last, error: lastError } = await supabase
                .from(config.table)
                .select("sort_order")
                .order("sort_order", { ascending: false })
                .limit(1)
                .maybeSingle()
            if (lastError) return dbError(lastError, `read ${config.table} order`)

            const { data, error } = await supabase
                .from(config.table)
                .insert({ ...parsed.data, sort_order: (last?.sort_order ?? 0) + 1 })
                .select("id")
                .single()
            if (error) return dbError(error, `create ${config.table}`)

            config.revalidate()
            return ok({ id: data.id }, 201)
        },
    }
}

export function itemHandlers (config: ContentConfig) {
    const notFound = () => fail(404, "not_found", `${config.label} not found.`)

    return {
        async GET (request: Request, context: Context) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            const id = await parseId(context)
            if (!id.success) return notFound()

            const row = await config.get(auth.ctx.supabase, id.data)
            return row ? ok(row) : notFound()
        },

        async POST (request: Request, context: Context) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            const id = await parseId(context)
            if (!id.success) return notFound()

            const parsed = await parseJson(request, config.inputSchema)
            if (!parsed.success) return parsed.response

            const { data, error } = await auth.ctx.supabase
                .from(config.table)
                .update(parsed.data)
                .eq("id", id.data)
                .select("id")
            if (error) return dbError(error, `update ${config.table}`)
            if (!data?.length) return notFound()

            config.revalidate()
            return ok({ id: id.data })
        },
    }
}

export function deleteHandler (config: ContentConfig) {
    return async function POST (request: Request, context: Context) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response
        const { supabase } = auth.ctx
        const id = await parseId(context)
        if (!id.success) return fail(404, "not_found", `${config.label} not found.`)

        const { data, error } = await supabase
            .from(config.table)
            .delete()
            .eq("id", id.data)
            .select(config.imageColumn ?? "id")
            .maybeSingle()
        if (error) return dbError(error, `delete ${config.table}`)
        if (!data) return fail(404, "not_found", `${config.label} not found.`)

        const imagePath = config.imageColumn ? (data as Record<string, string | null>)[config.imageColumn] : null
        if (imagePath) {
            const { error: storageError } = await supabase.storage.from("site-images").remove([imagePath])
            if (storageError) console.error(`[admin] ${config.table} image cleanup failed:`, storageError.message)
        }

        config.revalidate()
        return ok({ id: id.data, deleted: true })
    }
}

export function toggleHandler (config: ContentConfig) {
    return async function POST (request: Request, context: Context) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response
        const id = await parseId(context)
        if (!id.success) return fail(404, "not_found", `${config.label} not found.`)

        const parsed = await parseJson(request, contentToggleSchema)
        if (!parsed.success) return parsed.response

        const { data, error } = await auth.ctx.supabase
            .from(config.table)
            .update({ is_published: parsed.data.value })
            .eq("id", id.data)
            .select("id")
        if (error) return dbError(error, `toggle ${config.table}`)
        if (!data?.length) return fail(404, "not_found", `${config.label} not found.`)

        config.revalidate()
        return ok({ id: id.data, is_published: parsed.data.value })
    }
}

export function reorderHandler (config: ContentConfig) {
    return async function POST (request: Request) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response

        const parsed = await parseJson(request, reorderSchema)
        if (!parsed.success) return parsed.response

        const { error } = await auth.ctx.supabase.rpc("admin_reorder_rows", { p_table: config.table, ids: parsed.data.ids })
        if (error) return dbError(error, `reorder ${config.table}`)

        config.revalidate()
        return ok({ reordered: parsed.data.ids.length })
    }
}
