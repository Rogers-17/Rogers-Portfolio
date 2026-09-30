import { z } from "zod"

// Client-safe: the resume document (stored as JSON in resumes.data), design options and
// helpers. Every save, AI result and import goes through these schemas.

export const TEMPLATES = ["professional", "classic", "timeline", "sidebar"] as const
export type TemplateKey = (typeof TEMPLATES)[number]

export const TEMPLATE_INFO: Record<TemplateKey, { label: string, description: string, accents: string[] }> = {
    professional: { label: "Professional", description: "Photo header, navy & gold, multi-page friendly", accents: ["#1f3864", "#7a1f2b", "#0f5257", "#264d2e", "#2b2b2b", "#4b2a7a"] },
    classic: { label: "Classic", description: "Centred name, clean single column", accents: ["#2b2b2b", "#1f3864", "#7a1f2b", "#0f5257", "#264d2e", "#4b2a7a"] },
    timeline: { label: "Timeline", description: "Two columns with a vertical timeline", accents: ["#1f2a37", "#1f3864", "#7a1f2b", "#0f5257", "#264d2e", "#4b2a7a"] },
    sidebar: { label: "Sidebar", description: "Coloured sidebar with a round photo", accents: ["#6b1f24", "#1f3864", "#0f5257", "#264d2e", "#2b2b2b", "#4b2a7a"] },
}

// Secondary colour used by the Professional template (dates, rules, headline).
export const PROFESSIONAL_GOLD = "#b8912b"

export const DENSITIES = ["compact", "normal", "relaxed"] as const
export const PAPERS = ["A4", "LETTER"] as const

export const designSchema = z.object({
    accent: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().default(null),
    density: z.enum(DENSITIES).default("normal"),
    paper: z.enum(PAPERS).default("A4"),
    showPhoto: z.boolean().default(true),
})

export type ResumeDesign = z.infer<typeof designSchema>

export const DEFAULT_DESIGN: ResumeDesign = { accent: null, density: "normal", paper: "A4", showPhoto: true }

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const t = (max: number) => z.string().max(max, `Max ${max} characters`).default("")
const itemId = z.string().min(1).max(40)
const bullets = z.array(z.string().max(600, "Max 600 characters per bullet")).max(25, "Max 25 bullets").default([])

// Dates are free text so any format works: "2023", "Feb 2026", "April 12, 2025", "2017/2018".
const dates = {
    start: t(40),
    end: t(40),
    current: z.boolean().default(false),
}

export const itemSchemas = {
    summary: z.object({ id: itemId, text: t(3000) }),
    experience: z.object({ id: itemId, role: t(120), company: t(160), location: t(200), ...dates, bulletsLabel: t(120), bullets }),
    education: z.object({ id: itemId, credential: t(120), field: t(200), institution: t(200), location: t(200), ...dates, notes: t(600) }),
    skills: z.object({ id: itemId, name: t(120) }),
    projects: z.object({ id: itemId, name: t(160), role: t(120), url: t(300), ...dates, bullets }),
    certifications: z.object({ id: itemId, name: t(200), issuer: t(200), date: t(40), url: t(300) }),
    involvement: z.object({ id: itemId, role: t(120), organization: t(200), location: t(200), ...dates, bullets }),
    awards: z.object({ id: itemId, title: t(200), issuer: t(200), date: t(40), description: t(600) }),
    languages: z.object({ id: itemId, name: t(80), level: t(80) }),
    coursework: z.object({ id: itemId, name: t(200), institution: t(200) }),
    references: z.object({ id: itemId, name: t(120), title: t(160), organization: t(200), address: t(300), phone: t(60), email: t(200) }),
    custom: z.object({ id: itemId, heading: t(200), subheading: t(200), date: t(60), description: t(1500), bullets }),
} as const

export type SectionType = keyof typeof itemSchemas
export const SECTION_TYPES = Object.keys(itemSchemas) as SectionType[]

export type SectionItem<T extends SectionType = SectionType> = z.infer<(typeof itemSchemas)[T]>

const sectionBase = {
    id: itemId,
    title: z.string().max(80).default(""),
    visible: z.boolean().default(true),
    // Free line shown under the heading, e.g. "Available on request" for references.
    note: t(300),
}

const MAX_ITEMS = 60

export const sectionSchema = z.discriminatedUnion("type", SECTION_TYPES.map(type =>
    z.object({ ...sectionBase, type: z.literal(type), items: z.array(itemSchemas[type]).max(MAX_ITEMS, `Max ${MAX_ITEMS} entries`).default([]) }),
) as unknown as [z.ZodObject, z.ZodObject])

export type ResumeSection = { [T in SectionType]: {
    id: string
    type: T
    title: string
    visible: boolean
    note: string
    items: SectionItem<T>[]
} }[SectionType]

export const contactSchema = z.object({
    fullName: t(120),
    headline: t(160),
    email: t(200),
    phone: t(80),
    location: t(200),
    linkedin: t(300),
    website: t(300),
    // Extra labelled lines, e.g. "Date of Birth: November 21, 1998".
    details: z.array(z.object({ id: itemId, label: t(40), value: t(200) })).max(8).default([]),
    photoPath: z.string().regex(/^resumes\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/).nullable().default(null),
})

export type ResumeContact = z.infer<typeof contactSchema>

export const resumeDataSchema = z.object({
    contact: contactSchema,
    sections: z.array(sectionSchema).max(30, "Max 30 sections"),
})

export type ResumeData = { contact: ResumeContact, sections: ResumeSection[] }

export const MAX_DATA_BYTES = 300_000

// ---------------------------------------------------------------------------
// Section metadata and factories
// ---------------------------------------------------------------------------

export const SECTION_LABELS: Record<SectionType, string> = {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    involvement: "Involvement",
    awards: "Awards",
    languages: "Languages",
    coursework: "Coursework",
    references: "References",
    custom: "Custom section",
}

export const DEFAULT_TITLES: Record<SectionType, string> = {
    summary: "Profile",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    involvement: "Involvement",
    awards: "Awards",
    languages: "Languages",
    coursework: "Relevant Coursework",
    references: "References",
    custom: "Additional Information",
}

export function newId () {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 12)
        : Math.random().toString(36).slice(2, 14)
}

export function emptyItem<T extends SectionType> (type: T): SectionItem<T> {
    return itemSchemas[type].parse({ id: newId() }) as SectionItem<T>
}

export function newSection<T extends SectionType> (type: T, withItem = type === "summary"): ResumeSection {
    return {
        id: newId(),
        type,
        title: DEFAULT_TITLES[type],
        visible: true,
        note: "",
        items: withItem ? [emptyItem(type)] : [],
    } as ResumeSection
}

export function blankResume (): ResumeData {
    return {
        contact: contactSchema.parse({}),
        sections: [newSection("summary"), newSection("experience"), newSection("education"), newSection("skills")],
    }
}

// Parse loosely-typed JSON (DB rows, AI output, imports) into a valid document.
export function parseResumeData (value: unknown): { ok: true, data: ResumeData } | { ok: false, message: string } {
    const result = resumeDataSchema.safeParse(value)
    if (!result.success) {
        const issue = result.error.issues[0]
        return { ok: false, message: issue ? `${issue.path.join(".") || "resume"}: ${issue.message}` : "Invalid resume." }
    }
    const data = result.data as unknown as ResumeData
    if (JSON.stringify(data).length > MAX_DATA_BYTES) return { ok: false, message: "The resume is too large." }
    return { ok: true, data }
}

// Items with every text field empty are skipped when rendering.
export function isEmptyItem (item: Record<string, unknown>) {
    return Object.entries(item).every(([key, value]) => key === "id" || key === "current" || (Array.isArray(value) ? value.every(entry => !String(entry).trim()) : !String(value ?? "").trim()))
}

export function formatRange (item: { start?: string, end?: string, current?: boolean }) {
    const start = item.start?.trim() ?? ""
    const end = item.current ? "Present" : item.end?.trim() ?? ""
    if (start && end) return `${start} – ${end}`
    return start || end
}

export function cleanUrl (url: string) {
    return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")
}

// ---------------------------------------------------------------------------
// Resume record (API)
// ---------------------------------------------------------------------------

export const resumeMetaSchema = z.object({
    title: z.string().trim().min(1, "Give the resume a name").max(120, "Max 120 characters"),
    target_role: z.string().trim().max(120).nullish().transform(value => value || null),
    template: z.enum(TEMPLATES),
    design: designSchema,
    job_description: z.string().max(20000, "Max 20,000 characters").nullish().transform(value => value?.trim() || null),
    job_company: z.string().trim().max(120).nullish().transform(value => value || null),
})

export const resumeSaveSchema = resumeMetaSchema.extend({
    data: z.unknown().transform((value, ctx): ResumeData => {
        const parsed = parseResumeData(value)
        if (!parsed.ok) {
            ctx.addIssue({ code: "custom", message: parsed.message })
            return z.NEVER
        }
        return parsed.data
    }),
})

export type ResumeSaveInput = z.infer<typeof resumeSaveSchema>

export const resumeCreateSchema = z.object({
    title: z.string().trim().min(1).max(120),
    target_role: z.string().trim().max(120).nullish().transform(value => value || null),
    template: z.enum(TEMPLATES).optional(),
    data: z.unknown().optional(),
})

export type ResumeRecord = {
    id: string
    title: string
    target_role: string | null
    template: TemplateKey
    design: ResumeDesign
    data: ResumeData
    job_description: string | null
    job_company: string | null
    tailor_keywords: TailorKeyword[]
    is_archived: boolean
    created_at: string
    updated_at: string
}

export const tailorKeywordSchema = z.object({
    keyword: z.string().min(1).max(60),
    importance: z.enum(["high", "medium", "low"]).catch("medium"),
})

export type TailorKeyword = z.infer<typeof tailorKeywordSchema>
