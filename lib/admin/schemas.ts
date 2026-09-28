import { z } from "zod"
import { projectStatusSchema, slugSchema } from "@/lib/projects/shared"

// Shared by the admin forms (client) and the admin API (server). No server-only imports.

const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max, `Max ${max} characters`)

const optionalText = (max: number) =>
    z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => (value ? value : null))

// Either "<file>.<ext>" (seeded icons) or "<folder>/<file>.<ext>" (uploads); no traversal possible.
export const storagePathSchema = z
    .string()
    .regex(/^(?:[a-z0-9-]+\/)?[a-z0-9-]+\.(?:png|jpe?g|webp|avif|gif|svg)$/, "Invalid image path")

const optionalStoragePath = storagePathSchema.nullish().transform(value => value ?? null)

const httpsUrl = z
    .string()
    .trim()
    .nullish()
    .transform(value => (value ? value : null))
    .refine(value => value === null || /^https:\/\/[^\s]+\.[^\s]+$/i.test(value), "Must be a full https:// URL")
    .refine(value => value === null || value.length <= 300, "Max 300 characters")

export const LIMITS = {
    name: 80,
    tagline: 200,
    summary: 280,
    longText: 10_000,
    features: 30,
    gallery: 30,
    breakdown: 20,
    technologies: 40,
} as const

export const featureInputSchema = z.object({
    title: requiredText(120),
    description: optionalText(2000),
    image_path: optionalStoragePath,
    image_alt: optionalText(200),
})

export const galleryInputSchema = z.object({
    image_path: storagePathSchema,
    alt: requiredText(200),
})

export const breakdownInputSchema = z.object({
    label: requiredText(60),
    description: requiredText(2000),
})

export const projectInputSchema = z.object({
    name: requiredText(LIMITS.name),
    slug: slugSchema,
    tagline: requiredText(LIMITS.tagline),
    summary: requiredText(LIMITS.summary),
    project_type: requiredText(40),
    niche: optionalText(60),
    year: z.number({ error: "Enter a year" }).int().min(2000, "2000 or later").max(2100, "2100 or earlier"),
    client: optionalText(120),
    role: optionalText(120),
    status: projectStatusSchema,
    website_url: httpsUrl,
    cover_image_path: optionalStoragePath,
    cover_image_alt: optionalText(200),
    overview: optionalText(LIMITS.longText),
    problem: optionalText(LIMITS.longText),
    solution: optionalText(LIMITS.longText),
    dev_role: optionalText(LIMITS.longText),
    monetization: optionalText(LIMITS.longText),
    tech_intro: optionalText(2000),
    project_summary: optionalText(LIMITS.longText),
    is_published: z.boolean(),
    is_featured: z.boolean(),
    features: z.array(featureInputSchema).max(LIMITS.features, `Max ${LIMITS.features} features`),
    gallery: z.array(galleryInputSchema).max(LIMITS.gallery, `Max ${LIMITS.gallery} images`),
    tech_breakdown: z.array(breakdownInputSchema).max(LIMITS.breakdown, `Max ${LIMITS.breakdown} rows`),
    technology_ids: z
        .array(z.uuid())
        .max(LIMITS.technologies, `Max ${LIMITS.technologies} technologies`)
        .refine(ids => new Set(ids).size === ids.length, "Duplicate technology"),
})

export type ProjectInput = z.infer<typeof projectInputSchema>

export const technologyInputSchema = z.object({
    name: requiredText(60),
    slug: slugSchema,
    icon_path: optionalStoragePath,
})

export type TechnologyInput = z.infer<typeof technologyInputSchema>

export const toggleSchema = z.object({
    field: z.enum(["is_published", "is_featured"]),
    value: z.boolean(),
})

export const reorderSchema = z.object({
    ids: z.array(z.uuid()).max(500).refine(ids => new Set(ids).size === ids.length, "Duplicate id"),
})

export const loginSchema = z.object({
    email: z.email("Enter a valid email").max(254),
    password: z.string().min(1, "Enter your password").max(200),
})

export const uuidSchema = z.uuid()

export const uploadBuckets = ["project-images", "tech-icons", "site-images"] as const
export const uploadFolderSchema = z.string().regex(/^[a-z0-9-]{1,60}$/, "Invalid folder")
