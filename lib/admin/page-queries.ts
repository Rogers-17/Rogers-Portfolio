import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { initials } from "@/lib/content/schema"
import {
    ABOUT_COLUMNS,
    DEFAULT_ABOUT,
    DEFAULT_GALLERY,
    DEFAULT_PROJECT_FORM,
    FACT_ICONS,
    GALLERY_COLUMNS,
    PROJECT_FORM_COLUMNS,
    aboutRowSchema,
    galleryRowSchema,
    projectFormRowSchema,
    withAboutUrls,
    withGalleryUrls,
    type AboutContent,
    type GalleryContent,
    type ProjectFormSettings,
} from "@/lib/pages/schema"
import { CHANNELS, REQUEST_STATUSES, type RequestStatus } from "@/lib/project-request/schema"
import { publicImageUrl } from "@/lib/storage"

// Uncached, per-request reads for the admin (RLS lets admins see unpublished rows).

const MIGRATION_HINT = "Run supabase/migrations/20260930000000_about_gallery_project_form.sql in the Supabase SQL Editor."

function fail (what: string, error: { message: string, code?: string }): never {
    const missing = error.code === "PGRST205" || error.code === "42P01"
    throw new Error(missing ? `The ${what} table doesn't exist yet. ${MIGRATION_HINT}` : `Failed to load ${what}: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Singletons (a missing row falls back to the defaults; saving creates nothing, see the seed)
// ---------------------------------------------------------------------------

export async function getAboutForAdmin (supabase: SupabaseClient): Promise<AboutContent & { exists: boolean }> {
    const { data, error } = await supabase.from("about_page").select(ABOUT_COLUMNS).eq("id", 1).maybeSingle()
    if (error) fail("about_page", error)
    return { ...withAboutUrls(data ? aboutRowSchema.parse(data) : DEFAULT_ABOUT), exists: Boolean(data) }
}

export async function getGalleryForAdmin (supabase: SupabaseClient): Promise<GalleryContent & { exists: boolean }> {
    const { data, error } = await supabase.from("gallery_page").select(GALLERY_COLUMNS).eq("id", 1).maybeSingle()
    if (error) fail("gallery_page", error)
    return { ...withGalleryUrls(data ? galleryRowSchema.parse(data) : DEFAULT_GALLERY), exists: Boolean(data) }
}

export async function getProjectFormForAdmin (supabase: SupabaseClient): Promise<ProjectFormSettings & { exists: boolean }> {
    const { data, error } = await supabase.from("project_form_settings").select(PROJECT_FORM_COLUMNS).eq("id", 1).maybeSingle()
    if (error) fail("project_form_settings", error)
    return { ...(data ? projectFormRowSchema.parse(data) : DEFAULT_PROJECT_FORM), exists: Boolean(data) }
}

// ---------------------------------------------------------------------------
// About facts
// ---------------------------------------------------------------------------

const factRowSchema = z.object({
    id: z.string(),
    icon: z.enum(FACT_ICONS),
    title: z.string(),
    body: z.string(),
    is_published: z.boolean(),
    sort_order: z.number(),
})

export type AdminAboutFact = z.infer<typeof factRowSchema> & { initials: string }

const FACT_ADMIN_COLUMNS = "id, icon, title, body, is_published, sort_order"

const toAdminFact = (row: z.infer<typeof factRowSchema>): AdminAboutFact => ({ ...row, initials: initials(row.title) })

export async function listAboutFactsForAdmin (supabase: SupabaseClient): Promise<AdminAboutFact[]> {
    const { data, error } = await supabase.from("about_facts").select(FACT_ADMIN_COLUMNS).order("sort_order").order("created_at")
    if (error) fail("about_facts", error)
    return z.array(factRowSchema).parse(data).map(toAdminFact)
}

export async function getAboutFactForAdmin (supabase: SupabaseClient, id: string): Promise<AdminAboutFact | null> {
    const { data, error } = await supabase.from("about_facts").select(FACT_ADMIN_COLUMNS).eq("id", id).maybeSingle()
    if (error) fail("about_facts", error)
    return data ? toAdminFact(factRowSchema.parse(data)) : null
}

// ---------------------------------------------------------------------------
// Gallery photos
// ---------------------------------------------------------------------------

const photoRowSchema = z.object({
    id: z.string(),
    image_path: z.string(),
    width: z.number(),
    height: z.number(),
    alt: z.string(),
    caption: z.string().nullable(),
    is_published: z.boolean(),
    sort_order: z.number(),
})

export type AdminGalleryPhoto = z.infer<typeof photoRowSchema> & { url: string | null }

const PHOTO_ADMIN_COLUMNS = "id, image_path, width, height, alt, caption, is_published, sort_order"

const toAdminPhoto = (row: z.infer<typeof photoRowSchema>): AdminGalleryPhoto => ({ ...row, url: publicImageUrl("site-images", row.image_path) })

export async function listGalleryPhotosForAdmin (supabase: SupabaseClient): Promise<AdminGalleryPhoto[]> {
    const { data, error } = await supabase.from("gallery_photos").select(PHOTO_ADMIN_COLUMNS).order("sort_order").order("created_at")
    if (error) fail("gallery_photos", error)
    return z.array(photoRowSchema).parse(data).map(toAdminPhoto)
}

export async function getGalleryPhotoForAdmin (supabase: SupabaseClient, id: string): Promise<AdminGalleryPhoto | null> {
    const { data, error } = await supabase.from("gallery_photos").select(PHOTO_ADMIN_COLUMNS).eq("id", id).maybeSingle()
    if (error) fail("gallery_photos", error)
    return data ? toAdminPhoto(photoRowSchema.parse(data)) : null
}

// ---------------------------------------------------------------------------
// Project requests (inquiries)
// ---------------------------------------------------------------------------

const requestRowSchema = z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
    project_type: z.string(),
    business_name: z.string(),
    deadline_date: z.string().nullable(),
    deadline_time: z.string().nullable(),
    is_flexible: z.boolean(),
    budget: z.string(),
    details: z.string(),
    channel: z.enum(CHANNELS),
    visitor_phone: z.string().nullable(),
    status: z.enum(REQUEST_STATUSES),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
})

export type AdminProjectRequest = z.infer<typeof requestRowSchema>

const REQUEST_COLUMNS =
    "id, name, location, project_type, business_name, deadline_date, deadline_time, is_flexible, budget, details, channel, visitor_phone, status, notes, created_at, updated_at"

export async function listProjectRequests (supabase: SupabaseClient, status?: RequestStatus): Promise<AdminProjectRequest[]> {
    let query = supabase.from("project_requests").select(REQUEST_COLUMNS).order("created_at", { ascending: false }).limit(500)
    if (status) query = query.eq("status", status)
    const { data, error } = await query
    if (error) fail("project_requests", error)
    return z.array(requestRowSchema).parse(data).map(row => ({ ...row, deadline_time: row.deadline_time?.slice(0, 5) ?? null }))
}

export async function getProjectRequest (supabase: SupabaseClient, id: string): Promise<AdminProjectRequest | null> {
    const { data, error } = await supabase.from("project_requests").select(REQUEST_COLUMNS).eq("id", id).maybeSingle()
    if (error) fail("project_requests", error)
    if (!data) return null
    const row = requestRowSchema.parse(data)
    return { ...row, deadline_time: row.deadline_time?.slice(0, 5) ?? null }
}

// For the sidebar badge: never throws (the table may not exist yet).
export async function countNewProjectRequests (supabase: SupabaseClient): Promise<number> {
    const { count, error } = await supabase.from("project_requests").select("id", { count: "exact", head: true }).eq("status", "new")
    return error ? 0 : count ?? 0
}
