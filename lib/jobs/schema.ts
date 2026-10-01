import { z } from "zod"

// Client-safe job application schema, statuses and helpers.

export const JOB_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_STATUS_INFO: Record<JobStatus, { label: string, border: string, dot: string, text: string }> = {
    saved: { label: "Saved", border: "border-t-slate-400", dot: "bg-slate-400", text: "text-slate-300" },
    applied: { label: "Applied", border: "border-t-sky-400", dot: "bg-sky-400", text: "text-sky-300" },
    interview: { label: "Interview", border: "border-t-accent-2", dot: "bg-accent-2", text: "text-violet-300" },
    offer: { label: "Offer", border: "border-t-emerald-400", dot: "bg-emerald-400", text: "text-emerald-300" },
    rejected: { label: "Rejected", border: "border-t-rose-400", dot: "bg-rose-400", text: "text-rose-300" },
}

const optional = (max: number) => z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => value || null)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").nullish().transform(value => value || null)

export const jobInputSchema = z.object({
    company: z.string().trim().min(1, "Add the company").max(120),
    role: z.string().trim().min(1, "Add the role").max(120),
    job_url: z
        .string()
        .trim()
        .nullish()
        .transform(value => value || null)
        .refine(value => value === null || (/^https?:\/\/[^\s]+\.[^\s]+$/i.test(value) && value.length <= 500), "Must be a full http(s):// link"),
    location: optional(120),
    salary: optional(80),
    source: optional(80),
    status: z.enum(JOB_STATUSES),
    applied_on: date,
    follow_up_on: date,
    resume_id: z.uuid().nullish().transform(value => value ?? null),
    cover_letter_id: z.uuid().nullish().transform(value => value ?? null),
    priority: z.number().int().min(0).max(3).default(0),
    notes: optional(5000),
    is_archived: z.boolean().default(false),
})

export type JobInput = z.infer<typeof jobInputSchema>

export const jobMoveSchema = z.object({
    id: z.uuid(),
    status: z.enum(JOB_STATUSES),
    ids: z.array(z.uuid()).max(500),
})

export type JobRecord = JobInput & {
    id: string
    sort_order: number
    status_changed_at: string
    created_at: string
    updated_at: string
}

export const ACTIVE_STATUSES: JobStatus[] = ["saved", "applied", "interview"]

export function todayUtc () {
    return new Date().toISOString().slice(0, 10)
}

// "overdue" | "today" | null, for applications that are still in progress.
export function followUpState (job: Pick<JobRecord, "follow_up_on" | "status">, today: string) {
    if (!job.follow_up_on || !ACTIVE_STATUSES.includes(job.status)) return null
    if (job.follow_up_on < today) return "overdue"
    if (job.follow_up_on === today) return "today"
    return null
}

export function daysSince (iso: string, now: number) {
    return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))
}
