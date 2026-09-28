import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { publicImageUrl } from "@/lib/storage"
import { projectStatusSchema } from "@/lib/projects/shared"

// Uncached, per-request reads for the admin (RLS lets admins see drafts).

const adminProjectRowSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    project_type: z.string(),
    year: z.number(),
    status: projectStatusSchema,
    is_published: z.boolean(),
    is_featured: z.boolean(),
    sort_order: z.number(),
    updated_at: z.string(),
    cover_image_path: z.string().nullable(),
})

export type AdminProjectRow = z.infer<typeof adminProjectRowSchema> & { coverImageUrl: string | null }

export async function listProjectsForAdmin (supabase: SupabaseClient): Promise<AdminProjectRow[]> {
    const { data, error } = await supabase
        .from("projects")
        .select("id, slug, name, project_type, year, status, is_published, is_featured, sort_order, updated_at, cover_image_path")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

    if (error) throw new Error(`Failed to load projects: ${error.message}`)
    return z.array(adminProjectRowSchema).parse(data).map(row => ({
        ...row,
        coverImageUrl: publicImageUrl("project-images", row.cover_image_path),
    }))
}

const nullableText = z.string().nullable()

const adminProjectDetailSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    summary: z.string(),
    project_type: z.string(),
    niche: nullableText,
    year: z.number(),
    client: nullableText,
    role: nullableText,
    status: projectStatusSchema,
    website_url: nullableText,
    cover_image_path: nullableText,
    cover_image_alt: nullableText,
    overview: nullableText,
    problem: nullableText,
    solution: nullableText,
    dev_role: nullableText,
    monetization: nullableText,
    tech_intro: nullableText,
    project_summary: nullableText,
    is_published: z.boolean(),
    is_featured: z.boolean(),
    project_features: z.array(z.object({
        title: z.string(),
        description: nullableText,
        image_path: nullableText,
        image_alt: nullableText,
        sort_order: z.number(),
    })),
    project_images: z.array(z.object({ image_path: z.string(), alt: z.string(), sort_order: z.number() })),
    project_tech_breakdown: z.array(z.object({ label: z.string(), description: z.string(), sort_order: z.number() })),
    project_technologies: z.array(z.object({ technology_id: z.string(), sort_order: z.number() })),
})

const bySortOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

export async function getProjectForAdmin (supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
        .from("projects")
        .select(`
            id, slug, name, tagline, summary, project_type, niche, year, client, role, status,
            website_url, cover_image_path, cover_image_alt, overview, problem, solution, dev_role,
            monetization, tech_intro, project_summary, is_published, is_featured,
            project_features ( title, description, image_path, image_alt, sort_order ),
            project_images ( image_path, alt, sort_order ),
            project_tech_breakdown ( label, description, sort_order ),
            project_technologies ( technology_id, sort_order )
        `)
        .eq("id", id)
        .maybeSingle()

    if (error) throw new Error(`Failed to load project: ${error.message}`)
    if (!data) return null

    const row = adminProjectDetailSchema.parse(data)
    const { project_features, project_images, project_tech_breakdown, project_technologies, ...project } = row

    return {
        ...project,
        features: [...project_features].sort(bySortOrder).map(({ title, description, image_path, image_alt }) => ({ title, description, image_path, image_alt })),
        gallery: [...project_images].sort(bySortOrder).map(({ image_path, alt }) => ({ image_path, alt })),
        tech_breakdown: [...project_tech_breakdown].sort(bySortOrder).map(({ label, description }) => ({ label, description })),
        technology_ids: [...project_technologies].sort(bySortOrder).map(link => link.technology_id),
    }
}

export type AdminProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectForAdmin>>>

const adminTechnologySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon_path: z.string().nullable(),
    project_technologies: z.array(z.object({ count: z.number() })),
})

export type AdminTechnology = {
    id: string
    name: string
    slug: string
    iconPath: string | null
    iconUrl: string | null
    usageCount: number
}

export async function listTechnologiesForAdmin (supabase: SupabaseClient): Promise<AdminTechnology[]> {
    const { data, error } = await supabase
        .from("technologies")
        .select("id, name, slug, icon_path, project_technologies(count)")
        .order("name", { ascending: true })

    if (error) throw new Error(`Failed to load technologies: ${error.message}`)
    return z.array(adminTechnologySchema).parse(data).map(tech => ({
        id: tech.id,
        name: tech.name,
        slug: tech.slug,
        iconPath: tech.icon_path,
        iconUrl: publicImageUrl("tech-icons", tech.icon_path),
        usageCount: tech.project_technologies[0]?.count ?? 0,
    }))
}
