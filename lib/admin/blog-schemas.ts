import { z } from "zod"
import { storagePathSchema } from "@/lib/admin/schemas"
import { sanitizeDoc, type BlogDoc } from "@/lib/blog/content"
import { slugSchema } from "@/lib/projects/shared"

// Admin input schemas for the blog. Shared by the admin forms (client) and API (server).

const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max, `Max ${max} characters`)
const optionalText = (max: number) =>
    z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => (value ? value : null))
const optionalHttpsUrl = z
    .string()
    .trim()
    .nullish()
    .transform(value => (value ? value : null))
    .refine(value => value === null || /^https:\/\/[^\s]+\.[^\s]+$/i.test(value), "Must be a full https:// URL")
    .refine(value => value === null || value.length <= 300, "Max 300 characters")

export const blogPageInputSchema = z.object({
    badge: requiredText(40),
    title: requiredText(80),
    highlight: requiredText(80),
    intro: requiredText(600),
    substack_url: optionalHttpsUrl,
    cta_title: requiredText(80),
    cta_label: requiredText(40),
})

export type BlogPageInput = z.infer<typeof blogPageInputSchema>

// The body is rebuilt from an allowlist (lib/blog/content.ts); anything else is a 400.
export const blogContentSchema = z.unknown().transform((value, ctx): BlogDoc => {
    const result = sanitizeDoc(value)
    if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.message })
        return z.NEVER
    }
    return result.doc
})

export const POST_STATUSES = ["draft", "published"] as const

export const blogPostInputSchema = z.object({
    title: requiredText(160),
    slug: slugSchema,
    excerpt: optionalText(300),
    content: blogContentSchema,
    cover_path: storagePathSchema
        .refine(path => path.startsWith("blog/"), "Invalid image path")
        .nullish()
        .transform(value => value ?? null),
    seo_description: optionalText(200),
    canonical_url: optionalHttpsUrl,
    status: z.enum(POST_STATUSES),
    published_at: z.iso.datetime({ offset: true, error: "Pick a publish date" }),
})

export type BlogPostInput = z.infer<typeof blogPostInputSchema>
