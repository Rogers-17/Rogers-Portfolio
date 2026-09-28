import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { formatPeriod, initials } from "@/lib/content/schema"
import { publicImageUrl } from "@/lib/storage"

// Uncached, per-request reads for the admin (RLS lets admins see unpublished rows).

const testimonialRowSchema = z.object({
    id: z.string(),
    quote: z.string(),
    author_name: z.string(),
    author_role: z.string().nullable(),
    avatar_path: z.string().nullable(),
    rating: z.number().nullable(),
    is_published: z.boolean(),
    sort_order: z.number(),
    updated_at: z.string(),
})

export type AdminTestimonial = z.infer<typeof testimonialRowSchema> & { avatarUrl: string | null, initials: string }

const TESTIMONIAL_ADMIN_COLUMNS = "id, quote, author_name, author_role, avatar_path, rating, is_published, sort_order, updated_at"

const toAdminTestimonial = (row: z.infer<typeof testimonialRowSchema>): AdminTestimonial => ({
    ...row,
    avatarUrl: publicImageUrl("site-images", row.avatar_path),
    initials: initials(row.author_name),
})

export async function listTestimonialsForAdmin (supabase: SupabaseClient): Promise<AdminTestimonial[]> {
    const { data, error } = await supabase
        .from("testimonials")
        .select(TESTIMONIAL_ADMIN_COLUMNS)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    if (error) throw new Error(`Failed to load testimonials: ${error.message}`)
    return z.array(testimonialRowSchema).parse(data).map(toAdminTestimonial)
}

export async function getTestimonialForAdmin (supabase: SupabaseClient, id: string): Promise<AdminTestimonial | null> {
    const { data, error } = await supabase.from("testimonials").select(TESTIMONIAL_ADMIN_COLUMNS).eq("id", id).maybeSingle()
    if (error) throw new Error(`Failed to load testimonial: ${error.message}`)
    return data ? toAdminTestimonial(testimonialRowSchema.parse(data)) : null
}

const experienceRowSchema = z.object({
    id: z.string(),
    role: z.string(),
    company: z.string(),
    company_url: z.string().nullable(),
    logo_path: z.string().nullable(),
    location: z.string().nullable(),
    start_year: z.number(),
    start_month: z.number().nullable(),
    end_year: z.number().nullable(),
    end_month: z.number().nullable(),
    is_current: z.boolean(),
    description: z.string().nullable(),
    skills: z.array(z.string()),
    is_published: z.boolean(),
    sort_order: z.number(),
    updated_at: z.string(),
})

export type AdminExperience = z.infer<typeof experienceRowSchema> & { logoUrl: string | null, initials: string, period: string }

const EXPERIENCE_ADMIN_COLUMNS =
    "id, role, company, company_url, logo_path, location, start_year, start_month, end_year, end_month, is_current, description, skills, is_published, sort_order, updated_at"

const toAdminExperience = (row: z.infer<typeof experienceRowSchema>): AdminExperience => ({
    ...row,
    logoUrl: publicImageUrl("site-images", row.logo_path),
    initials: initials(row.company),
    period: formatPeriod(row),
})

export async function listExperiencesForAdmin (supabase: SupabaseClient): Promise<AdminExperience[]> {
    const { data, error } = await supabase
        .from("experiences")
        .select(EXPERIENCE_ADMIN_COLUMNS)
        .order("sort_order", { ascending: true })
        .order("start_year", { ascending: false })
    if (error) throw new Error(`Failed to load experience: ${error.message}`)
    return z.array(experienceRowSchema).parse(data).map(toAdminExperience)
}

export async function getExperienceForAdmin (supabase: SupabaseClient, id: string): Promise<AdminExperience | null> {
    const { data, error } = await supabase.from("experiences").select(EXPERIENCE_ADMIN_COLUMNS).eq("id", id).maybeSingle()
    if (error) throw new Error(`Failed to load experience: ${error.message}`)
    return data ? toAdminExperience(experienceRowSchema.parse(data)) : null
}
