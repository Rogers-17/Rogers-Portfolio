import { z } from "zod"
import { storagePathSchema } from "@/lib/admin/schemas"

// Shared by the admin forms (client) and the admin API (server). No server-only imports.

const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max, `Max ${max} characters`)
const optionalText = (max: number) =>
    z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => (value ? value : null))
const optionalPath = storagePathSchema.nullish().transform(value => value ?? null)
const month = z.number().int().min(1).max(12).nullish().transform(value => value ?? null)
const year = (label: string) =>
    z.number({ error: `Enter a ${label} year` }).int().min(1970, "1970 or later").max(2100, "2100 or earlier")

export const QUOTE_MAX = 1000

export const testimonialInputSchema = z.object({
    quote: requiredText(QUOTE_MAX),
    author_name: requiredText(80),
    author_role: optionalText(120),
    avatar_path: optionalPath,
    rating: z.number().int().min(1, "1 to 5").max(5, "1 to 5").nullish().transform(value => value ?? null),
    is_published: z.boolean(),
})

export type TestimonialInput = z.infer<typeof testimonialInputSchema>

export const SKILLS_MAX = 20

export const experienceInputSchema = z
    .object({
        role: requiredText(120),
        company: requiredText(120),
        company_url: z
            .string()
            .trim()
            .nullish()
            .transform(value => (value ? value : null))
            .refine(value => value === null || /^https:\/\/[^\s]+\.[^\s]+$/i.test(value), "Must be a full https:// URL")
            .refine(value => value === null || value.length <= 300, "Max 300 characters"),
        logo_path: optionalPath,
        location: optionalText(120),
        start_year: year("start"),
        start_month: month,
        end_year: year("end").nullish().transform(value => value ?? null),
        end_month: month,
        is_current: z.boolean(),
        description: optionalText(2000),
        skills: z
            .array(z.string().trim().min(1).max(40, "Max 40 characters"))
            .max(SKILLS_MAX, `Max ${SKILLS_MAX} skills`)
            .refine(skills => new Set(skills.map(skill => skill.toLowerCase())).size === skills.length, "Duplicate skill"),
        is_published: z.boolean(),
    })
    .transform(value => (value.is_current ? { ...value, end_year: null, end_month: null } : value))
    .superRefine((value, ctx) => {
        if (!value.is_current && value.end_year === null) {
            ctx.addIssue({ code: "custom", path: ["end_year"], message: "End year is required unless this is your current role" })
            return
        }
        if (value.end_year !== null) {
            const start = value.start_year * 12 + (value.start_month ?? 1)
            const end = value.end_year * 12 + (value.end_month ?? 12)
            if (end < start) ctx.addIssue({ code: "custom", path: ["end_year"], message: "End date must be after the start date" })
        }
    })

export type ExperienceInput = z.infer<typeof experienceInputSchema>

export const contentToggleSchema = z.object({
    field: z.literal("is_published"),
    value: z.boolean(),
})
