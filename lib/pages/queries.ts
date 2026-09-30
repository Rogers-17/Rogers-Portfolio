import "server-only"
import { cache } from "react"
import { z } from "zod"
import type { PostgrestError } from "@supabase/supabase-js"
import { createServerSupabase } from "@/lib/supabase/server"
import { ABOUT_CACHE_TAG, GALLERY_CACHE_TAG, PROJECT_FORM_CACHE_TAG } from "@/lib/pages/cache"
import {
    ABOUT_COLUMNS,
    ABOUT_FACT_COLUMNS,
    DEFAULT_ABOUT,
    DEFAULT_ABOUT_FACTS,
    DEFAULT_GALLERY,
    DEFAULT_PROJECT_FORM,
    GALLERY_COLUMNS,
    GALLERY_PHOTO_COLUMNS,
    PROJECT_FORM_COLUMNS,
    aboutFactSchema,
    aboutRowSchema,
    galleryPhotoSchema,
    galleryRowSchema,
    projectFormRowSchema,
    withAboutUrls,
    withGalleryUrls,
    type AboutContent,
    type AboutFact,
    type GalleryContent,
    type GalleryPhoto,
    type ProjectFormSettings,
} from "@/lib/pages/schema"

// Before the Phase 4 migration has been run the tables don't exist yet: fall back to the
// built-in defaults so the pages (and the build) keep working. Any other error is thrown.
function isMissingTable (error: PostgrestError) {
    return error.code === "PGRST205" || error.code === "42P01"
}

function handle (error: PostgrestError, what: string) {
    if (isMissingTable(error)) {
        console.warn(`[pages] ${what}: table missing, using defaults. Run the Phase 4 migration.`)
        return
    }
    throw new Error(`Failed to load ${what}: ${error.message}`)
}

export const getAboutContent = cache(async (): Promise<{ page: AboutContent, facts: AboutFact[] }> => {
    const supabase = createServerSupabase(ABOUT_CACHE_TAG)
    const [pageResult, factsResult] = await Promise.all([
        supabase.from("about_page").select(ABOUT_COLUMNS).eq("id", 1).maybeSingle(),
        supabase.from("about_facts").select(ABOUT_FACT_COLUMNS).eq("is_published", true).order("sort_order").order("created_at"),
    ])

    if (pageResult.error) handle(pageResult.error, "about page")
    if (factsResult.error) handle(factsResult.error, "about facts")

    const page = pageResult.data ? aboutRowSchema.parse(pageResult.data) : DEFAULT_ABOUT
    const facts = factsResult.error ? DEFAULT_ABOUT_FACTS : z.array(aboutFactSchema).parse(factsResult.data)
    return { page: withAboutUrls(page), facts }
})

export const getGalleryContent = cache(async (): Promise<{ page: GalleryContent, photos: GalleryPhoto[] }> => {
    const supabase = createServerSupabase(GALLERY_CACHE_TAG)
    const [pageResult, photosResult] = await Promise.all([
        supabase.from("gallery_page").select(GALLERY_COLUMNS).eq("id", 1).maybeSingle(),
        supabase.from("gallery_photos").select(GALLERY_PHOTO_COLUMNS).eq("is_published", true).order("sort_order").order("created_at"),
    ])

    if (pageResult.error) handle(pageResult.error, "gallery page")
    if (photosResult.error) handle(photosResult.error, "gallery photos")

    const page = pageResult.data ? galleryRowSchema.parse(pageResult.data) : DEFAULT_GALLERY
    const photos = photosResult.error ? [] : z.array(galleryPhotoSchema).parse(photosResult.data)
    return { page: withGalleryUrls(page), photos }
})

export const getProjectFormSettings = cache(async (): Promise<ProjectFormSettings> => {
    const { data, error } = await createServerSupabase(PROJECT_FORM_CACHE_TAG)
        .from("project_form_settings")
        .select(PROJECT_FORM_COLUMNS)
        .eq("id", 1)
        .maybeSingle()

    if (error) handle(error, "project form settings")
    return data ? projectFormRowSchema.parse(data) : DEFAULT_PROJECT_FORM
})
