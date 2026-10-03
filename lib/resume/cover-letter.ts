import { z } from "zod"

// Client-safe cover letter input schema (admin forms + API), plus the defaults and helpers
// shared by the editor and the PDF.

export const COVER_STYLES = ["formal", "resume"] as const
export type CoverStyle = (typeof COVER_STYLES)[number]

const optional = (max: number) => z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => value || null)

export const coverLetterInputSchema = z.object({
    resume_id: z.uuid().nullish().transform(value => value ?? null),
    title: z.string().trim().min(1, "Give the letter a name").max(120),
    company: optional(120),
    job_title: optional(120),
    // Multi-line blocks (one line per row of the letter).
    sender_name: optional(120),
    sender_contact: optional(300),
    sender_address: optional(300),
    recipient: optional(600),
    letter_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").nullish().transform(value => value || null),
    salutation: optional(120),
    subject: optional(200),
    body: z.string().max(10000, "Max 10,000 characters"),
    closing: optional(60),
    style: z.enum(COVER_STYLES).default("formal"),
})

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>

export const COVER_TONES = ["professional", "warm", "confident", "concise"] as const

export const DEFAULT_SALUTATION = "Dear Hiring Manager,"
export const DEFAULT_CLOSING = "Sincerely,"

// "IT Officer" -> "RE: Application for IT Officer Position"
export function defaultSubject (jobTitle: string | null | undefined) {
    const title = jobTitle?.trim()
    if (!title) return ""
    return `RE: Application for ${title}${/\b(position|role)$/i.test(title) ? "" : " Position"}`
}

// "2026-09-24" -> "September 24, 2026" (UTC calendar day, so server and browser agree).
export function letterDate (iso: string | null | undefined) {
    if (!iso) return ""
    const date = new Date(`${iso}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export const blockLines = (value: string | null | undefined) => (value ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean)
