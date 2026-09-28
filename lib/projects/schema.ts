import { z } from "zod"
import { publicImageUrl } from "@/lib/storage"

export const slugSchema = z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)

export const projectStatusSchema = z.enum(["active", "in_development", "completed", "archived"])
export type ProjectStatus = z.infer<typeof projectStatusSchema>

const bySortOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

// ---------------------------------------------------------------------------
// Card (homepage, /projects, prev/next)
// ---------------------------------------------------------------------------
export const PROJECT_CARD_COLUMNS = "slug, name, summary, project_type, status, cover_image_path, cover_image_alt"

export const projectCardSchema = z
    .object({
        slug: slugSchema,
        name: z.string(),
        summary: z.string(),
        project_type: z.string(),
        status: projectStatusSchema,
        cover_image_path: z.string().nullable(),
        cover_image_alt: z.string().nullable(),
    })
    .transform(row => ({
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        type: row.project_type,
        status: row.status,
        coverImageUrl: publicImageUrl("project-images", row.cover_image_path),
        coverImageAlt: row.cover_image_alt ?? row.name,
    }))

export type ProjectCard = z.infer<typeof projectCardSchema>

// ---------------------------------------------------------------------------
// Detail (/projects/[slug])
// ---------------------------------------------------------------------------
export const PROJECT_DETAIL_COLUMNS = `
    slug, name, tagline, summary, project_type, niche, year, client, role, status,
    website_url, cover_image_path, cover_image_alt, overview, problem, solution,
    dev_role, monetization, tech_intro, project_summary,
    project_features ( id, title, description, image_path, image_alt, sort_order ),
    project_images ( id, image_path, alt, sort_order ),
    project_tech_breakdown ( id, label, description, sort_order ),
    project_technologies ( sort_order, technologies ( id, name, slug, icon_path ) )
`

const text = z.string().nullable()

export const projectDetailSchema = z
    .object({
        slug: slugSchema,
        name: z.string(),
        tagline: z.string(),
        summary: z.string(),
        project_type: z.string(),
        niche: text,
        year: z.number().int(),
        client: text,
        role: text,
        status: projectStatusSchema,
        website_url: z.url({ protocol: /^https$/ }).nullable(),
        cover_image_path: text,
        cover_image_alt: text,
        overview: text,
        problem: text,
        solution: text,
        dev_role: text,
        monetization: text,
        tech_intro: text,
        project_summary: text,
        project_features: z.array(z.object({
            id: z.string(),
            title: z.string(),
            description: text,
            image_path: text,
            image_alt: text,
            sort_order: z.number(),
        })),
        project_images: z.array(z.object({
            id: z.string(),
            image_path: z.string(),
            alt: z.string(),
            sort_order: z.number(),
        })),
        project_tech_breakdown: z.array(z.object({
            id: z.string(),
            label: z.string(),
            description: z.string(),
            sort_order: z.number(),
        })),
        project_technologies: z.array(z.object({
            sort_order: z.number(),
            technologies: z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                icon_path: text,
            }).nullable(),
        })),
    })
    .transform(row => ({
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        summary: row.summary,
        type: row.project_type,
        niche: row.niche,
        year: row.year,
        client: row.client,
        role: row.role,
        status: row.status,
        websiteUrl: row.website_url,
        coverImageUrl: publicImageUrl("project-images", row.cover_image_path),
        coverImageAlt: row.cover_image_alt ?? row.name,
        overview: row.overview,
        problem: row.problem,
        solution: row.solution,
        devRole: row.dev_role,
        monetization: row.monetization,
        techIntro: row.tech_intro,
        projectSummary: row.project_summary,
        features: [...row.project_features].sort(bySortOrder).map(feature => ({
            id: feature.id,
            title: feature.title,
            description: feature.description,
            imageUrl: publicImageUrl("project-images", feature.image_path),
            imageAlt: feature.image_alt ?? feature.title,
        })),
        gallery: [...row.project_images].sort(bySortOrder).map(image => ({
            id: image.id,
            url: publicImageUrl("project-images", image.image_path) as string,
            alt: image.alt,
        })),
        techBreakdown: [...row.project_tech_breakdown].sort(bySortOrder).map(({ id, label, description }) => ({ id, label, description })),
        technologies: [...row.project_technologies].sort(bySortOrder).flatMap(link =>
            link.technologies
                ? [{
                    id: link.technologies.id,
                    name: link.technologies.name,
                    iconUrl: publicImageUrl("tech-icons", link.technologies.icon_path),
                }]
                : []
        ),
    }))

export type ProjectDetail = z.infer<typeof projectDetailSchema>
export type ProjectFeature = ProjectDetail["features"][number]
export type ProjectTechnology = ProjectDetail["technologies"][number]
