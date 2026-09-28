import { z } from "zod"
import { publicImageUrl } from "@/lib/storage"

// Client-safe read schemas + display helpers for testimonials and experience.

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

export function initials (name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"]
    return letters.join("").toUpperCase()
}

export const TESTIMONIAL_COLUMNS = "id, quote, author_name, author_role, avatar_path, rating"

export const testimonialPublicSchema = z
    .object({
        id: z.string(),
        quote: z.string(),
        author_name: z.string(),
        author_role: z.string().nullable(),
        avatar_path: z.string().nullable(),
        rating: z.number().int().min(1).max(5).nullable(),
    })
    .transform(row => ({
        id: row.id,
        quote: row.quote,
        name: row.author_name,
        role: row.author_role,
        rating: row.rating,
        initials: initials(row.author_name),
        avatarUrl: publicImageUrl("site-images", row.avatar_path),
    }))

export type TestimonialPublic = z.infer<typeof testimonialPublicSchema>

export type ExperienceDates = {
    start_year: number
    start_month: number | null
    end_year: number | null
    end_month: number | null
    is_current: boolean
}

const formatPoint = (year: number, month: number | null) => (month ? `${MONTHS[month - 1]} ${year}` : String(year))

export function formatPeriod (dates: ExperienceDates): string {
    const start = formatPoint(dates.start_year, dates.start_month)
    const end = dates.is_current || dates.end_year === null ? "Present" : formatPoint(dates.end_year, dates.end_month)
    return `${start} — ${end}`
}

// Only shown when months are known, so year-only entries never get invented precision.
export function formatDuration (dates: ExperienceDates, now: Date = new Date()): string | null {
    if (!dates.start_month) return null
    let endYear: number
    let endMonth: number
    if (dates.is_current || dates.end_year === null) {
        endYear = now.getFullYear()
        endMonth = now.getMonth() + 1
    } else {
        if (!dates.end_month) return null
        endYear = dates.end_year
        endMonth = dates.end_month
    }

    const total = (endYear - dates.start_year) * 12 + (endMonth - dates.start_month) + 1
    if (total <= 0) return null
    const years = Math.floor(total / 12)
    const months = total % 12
    const parts = [
        years ? `${years} yr${years === 1 ? "" : "s"}` : null,
        months ? `${months} mo${months === 1 ? "" : "s"}` : null,
    ].filter(Boolean)
    return parts.join(" ")
}

export const EXPERIENCE_COLUMNS =
    "id, role, company, company_url, logo_path, location, start_year, start_month, end_year, end_month, is_current, description, skills"

export const experiencePublicSchema = z
    .object({
        id: z.string(),
        role: z.string(),
        company: z.string(),
        company_url: z.string().nullable(),
        logo_path: z.string().nullable(),
        location: z.string().nullable(),
        start_year: z.number().int(),
        start_month: z.number().int().nullable(),
        end_year: z.number().int().nullable(),
        end_month: z.number().int().nullable(),
        is_current: z.boolean(),
        description: z.string().nullable(),
        skills: z.array(z.string()),
    })
    .transform(row => ({
        id: row.id,
        role: row.role,
        company: row.company,
        companyUrl: row.company_url,
        logoUrl: publicImageUrl("site-images", row.logo_path),
        location: row.location,
        isCurrent: row.is_current,
        period: formatPeriod(row),
        dates: {
            start_year: row.start_year,
            start_month: row.start_month,
            end_year: row.end_year,
            end_month: row.end_month,
            is_current: row.is_current,
        } satisfies ExperienceDates,
        description: row.description,
        skills: row.skills,
    }))

export type ExperiencePublic = z.infer<typeof experiencePublicSchema>
