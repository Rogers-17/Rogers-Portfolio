import { z } from "zod"

// Shared by the Start-a-project wizard (client) and POST /api/project-requests (server).

export const DETAILS_MIN = 20
export const DETAILS_MAX = 2000

export const CHANNELS = ["whatsapp", "email", "callback"] as const
export type Channel = (typeof CHANNELS)[number]

export const REQUEST_STATUSES = ["new", "contacted", "won", "lost", "archived"] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

export const phoneSchema = z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter a valid phone number, e.g. +234 801 234 5678")
    .refine(value => value.replace(/\D/g, "").length >= 7, "Enter a valid phone number, e.g. +234 801 234 5678")

const text = (min: number, max: number, message: string) =>
    z.string().trim().min(min, message).max(max, `Max ${max} characters`)

// YYYY-MM-DD, not before today (visitor's local date may lag UTC by a day, so allow yesterday server-side).
export function todayIso (offsetDays = 0) {
    const date = new Date()
    date.setDate(date.getDate() + offsetDays)
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${date.getFullYear()}-${month}-${day}`
}

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine(value => !Number.isNaN(Date.parse(value)), "Pick a valid date")
    .refine(value => value >= todayIso(-1), "Pick a date in the future")
    .refine(value => value <= todayIso(365 * 5), "Pick a date within the next 5 years")

// Per-step rules (the wizard validates one step at a time with these).
export const stepSchemas = {
    name: z.object({ name: text(2, 60, "Enter your name (at least 2 characters)") }),
    location: z.object({ location: text(2, 60, "Choose a country or type yours") }),
    type: z.object({ project_type: text(1, 60, "Choose a project type") }),
    business: z.object({ business_name: text(1, 80, "Enter a business or product name") }),
    deadline: z
        .object({
            is_flexible: z.boolean(),
            deadline_date: dateSchema.nullable(),
            deadline_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time").nullable(),
        })
        .superRefine((value, ctx) => {
            if (!value.is_flexible && !value.deadline_date) {
                ctx.addIssue({ code: "custom", path: ["deadline_date"], message: "Pick a date, or choose “I'm flexible”" })
            }
        })
        .transform(value => (value.is_flexible ? { ...value, deadline_date: null, deadline_time: null } : value)),
    budget: z.object({ budget: text(1, 60, "Choose a budget range") }),
    details: z.object({ details: text(DETAILS_MIN, DETAILS_MAX, `Tell me a bit more (at least ${DETAILS_MIN} characters)`) }),
} as const

export const projectRequestSchema = z
    .object({
        ...stepSchemas.name.shape,
        ...stepSchemas.location.shape,
        ...stepSchemas.type.shape,
        ...stepSchemas.business.shape,
        is_flexible: z.boolean(),
        deadline_date: dateSchema.nullable(),
        deadline_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time").nullable(),
        ...stepSchemas.budget.shape,
        ...stepSchemas.details.shape,
        channel: z.enum(CHANNELS),
        visitor_phone: phoneSchema.nullable(),
    })
    .superRefine((value, ctx) => {
        if (!value.is_flexible && !value.deadline_date) {
            ctx.addIssue({ code: "custom", path: ["deadline_date"], message: "Pick a date, or choose “I'm flexible”" })
        }
        if (value.channel === "callback" && !value.visitor_phone) {
            ctx.addIssue({ code: "custom", path: ["visitor_phone"], message: "Enter your phone number so I can reach you" })
        }
    })
    .transform(value => ({
        ...value,
        deadline_date: value.is_flexible ? null : value.deadline_date,
        deadline_time: value.is_flexible ? null : value.deadline_time,
        visitor_phone: value.channel === "callback" ? value.visitor_phone : null,
    }))

export type ProjectRequestInput = z.infer<typeof projectRequestSchema>

// Wire format: the request plus the anti-spam fields (honeypot + form start time).
export const projectRequestBodySchema = z.object({
    website: z.string().max(200).optional(),
    started_at: z.number().int().optional(),
}).loose()

// ---------------------------------------------------------------------------
// Formatting the summary for WhatsApp / email / SMS
// ---------------------------------------------------------------------------

export function formatDeadline (request: Pick<ProjectRequestInput, "is_flexible" | "deadline_date" | "deadline_time">) {
    if (request.is_flexible || !request.deadline_date) return "Flexible"
    const date = new Date(`${request.deadline_date}T00:00:00`)
    const label = Number.isNaN(date.getTime())
        ? request.deadline_date
        : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    return request.deadline_time ? `${label}, ${request.deadline_time}` : label
}

type SummaryInput = Omit<ProjectRequestInput, "channel" | "visitor_phone"> & { visitor_phone?: string | null }

export function formatSummary (request: SummaryInput, maxDetails = DETAILS_MAX): string {
    const details = request.details.length > maxDetails ? `${request.details.slice(0, maxDetails - 1).trimEnd()}…` : request.details
    return [
        `Hi Rogers, I'd like to start a project.`,
        ``,
        `Name: ${request.name}`,
        `Based in: ${request.location}`,
        `Project type: ${request.project_type}`,
        `Business / product: ${request.business_name}`,
        `Needed by: ${formatDeadline(request)}`,
        `Budget: ${request.budget}`,
        ...(request.visitor_phone ? [`Phone: ${request.visitor_phone}`] : []),
        ``,
        `Project details:`,
        details,
    ].join("\n")
}

// Keep generated wa.me / mailto / sms URLs under ~1,800 characters by trimming the details.
export function buildChannelUrl (
    kind: "whatsapp" | "email" | "sms",
    target: string,
    request: SummaryInput,
    limit = 1800,
): string {
    const build = (maxDetails: number) => {
        const body = encodeURIComponent(formatSummary(request, maxDetails))
        if (kind === "whatsapp") return `https://wa.me/${target.replace(/\D/g, "")}?text=${body}`
        if (kind === "sms") return `sms:${encodeURIComponent(target.replace(/[^\d+]/g, ""))}?body=${body}`
        const subject = encodeURIComponent(`New project: ${request.business_name}`)
        return `mailto:${target}?subject=${subject}&body=${body}`
    }

    let maxDetails = DETAILS_MAX
    let url = build(maxDetails)
    while (url.length > limit && maxDetails > 80) {
        maxDetails = Math.floor(maxDetails * 0.8)
        url = build(maxDetails)
    }
    return url
}
