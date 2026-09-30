import { z } from "zod"
import { storagePathSchema } from "@/lib/admin/schemas"
import { FACT_ICONS, STEP_KEYS, stepCopySchema } from "@/lib/pages/schema"
import { REQUEST_STATUSES, phoneSchema } from "@/lib/project-request/schema"

// Admin input schemas for the About / Gallery / Project form pages and inquiries.
// Shared by the admin forms (client) and the admin API (server). No server-only imports.

const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max, `Max ${max} characters`)
const optionalText = (max: number) =>
    z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => (value ? value : null))

// Images must live in the expected folder of the site-images bucket.
const folderPath = (folder: string) =>
    storagePathSchema.refine(path => path.startsWith(`${folder}/`), "Invalid image path")
const optionalFolderPath = (folder: string) => folderPath(folder).nullish().transform(value => value ?? null)

export const aboutPageInputSchema = z.object({
    badge: requiredText(40),
    title: requiredText(80),
    highlight: requiredText(80),
    intro: requiredText(4000),
    photo_primary_path: optionalFolderPath("about"),
    photo_secondary_path: optionalFolderPath("about"),
    photo_alt: requiredText(200),
    background_path: optionalFolderPath("about"),
    early_eyebrow: requiredText(60),
    early_title: requiredText(60),
    early_body: requiredText(6000),
    journey_eyebrow: requiredText(60),
    journey_title: requiredText(60),
    journey_body: requiredText(6000),
    journey_image_path: optionalFolderPath("about"),
    journey_image_alt: requiredText(200),
    cta_title: requiredText(80),
    cta_label: requiredText(40),
})

export type AboutPageInput = z.infer<typeof aboutPageInputSchema>

export const aboutFactInputSchema = z.object({
    icon: z.enum(FACT_ICONS, { error: "Choose an icon" }),
    title: requiredText(60),
    body: requiredText(2000),
    is_published: z.boolean(),
})

export type AboutFactInput = z.infer<typeof aboutFactInputSchema>

export const galleryPageInputSchema = z.object({
    badge: requiredText(40),
    title: requiredText(80),
    highlight: requiredText(80),
    quote: requiredText(2000),
    signature: optionalText(60),
    hero_path: optionalFolderPath("gallery"),
    hero_alt: requiredText(200),
    cta_title: requiredText(80),
    cta_label: requiredText(40),
})

export type GalleryPageInput = z.infer<typeof galleryPageInputSchema>

const dimension = z.number().int().min(1).max(10000)

export const galleryPhotoInputSchema = z.object({
    image_path: folderPath("gallery"),
    width: dimension,
    height: dimension,
    alt: requiredText(200),
    caption: optionalText(200),
    is_published: z.boolean(),
})

export type GalleryPhotoInput = z.infer<typeof galleryPhotoInputSchema>

export const GALLERY_BULK_MAX = 20

export const galleryBulkInputSchema = z.object({
    photos: z
        .array(galleryPhotoInputSchema.omit({ is_published: true }))
        .min(1, "Add at least one photo")
        .max(GALLERY_BULK_MAX, `Max ${GALLERY_BULK_MAX} photos at once`),
})

const optionList = (max: number, label: string) =>
    z
        .array(z.string().trim().min(1).max(60, "Max 60 characters"))
        .max(max, `Max ${max} ${label}`)
        .refine(values => new Set(values.map(value => value.toLowerCase())).size === values.length, `Duplicate ${label.replace(/s$/, "")}`)

export const COUNTRIES_MAX = 4
export const OPTIONS_MAX = 12

export const projectFormInputSchema = z.object({
    whatsapp_number: z
        .string()
        .trim()
        .nullish()
        .transform(value => (value ? value.replace(/[\s()-]/g, "").replace(/^\+/, "") : null))
        .refine(value => value === null || /^[0-9]{7,15}$/.test(value), "Digits only, with the country code (e.g. 2348012345678)"),
    contact_email: z
        .string()
        .trim()
        .nullish()
        .transform(value => (value ? value : null))
        .refine(value => value === null || (value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)), "Enter a valid email"),
    contact_phone: z
        .string()
        .trim()
        .nullish()
        .transform(value => (value ? value : null))
        .pipe(phoneSchema.nullable()),
    countries: optionList(COUNTRIES_MAX, "countries"),
    project_types: optionList(OPTIONS_MAX, "project types").refine(values => values.length > 0, "Add at least one project type"),
    budgets: optionList(OPTIONS_MAX, "budgets").refine(values => values.length > 0, "Add at least one budget"),
    steps: z.object(Object.fromEntries(STEP_KEYS.map(key => [key, stepCopySchema])) as Record<(typeof STEP_KEYS)[number], typeof stepCopySchema>),
})

export type ProjectFormInput = z.infer<typeof projectFormInputSchema>

export const projectRequestUpdateSchema = z.object({
    status: z.enum(REQUEST_STATUSES),
    notes: optionalText(4000),
})
