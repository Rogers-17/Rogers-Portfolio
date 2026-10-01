import { z } from "zod"

// Client-safe document archive schema: groups, formats, filters and helpers.

export const DOCUMENT_GROUPS = ["career", "academic", "achievements", "projects", "programs", "business", "personal", "other"] as const
export type DocumentGroup = (typeof DOCUMENT_GROUPS)[number]

export const DOCUMENT_GROUP_INFO: Record<DocumentGroup, { label: string, hint: string }> = {
    career: { label: "Career", hint: "CVs, cover letters, job applications, employment documents, references" },
    academic: { label: "Academic", hint: "Transcripts, results, assignments, research, university documents" },
    achievements: { label: "Achievements", hint: "Certificates, awards, recognition" },
    projects: { label: "Projects", hint: "PRDs, reports, case studies, pitch decks, technical documentation" },
    programs: { label: "Programs", hint: "Orange/OSC, fellowships, hackathons, trainings, workshops" },
    business: { label: "Business", hint: "Contracts, proposals, client documents, invoices and finance" },
    personal: { label: "Personal", hint: "Identity and private records" },
    other: { label: "Other", hint: "Anything that doesn't fit the groups above" },
}

export const DOCUMENT_FORMATS = ["pdf", "png", "jpg", "webp", "docx", "xlsx", "pptx", "doc", "xls", "txt", "csv", "md", "zip"] as const
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number]

// The Content-Type each format is stored with (the browser's own guess is never used).
export const FORMAT_MIME: Record<DocumentFormat, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword",
    xls: "application/vnd.ms-excel",
    txt: "text/plain",
    csv: "text/csv",
    md: "text/markdown",
    zip: "application/zip",
}

export const PREVIEWABLE: readonly DocumentFormat[] = ["pdf", "png", "jpg", "webp"]
export const IMAGE_FORMATS: readonly DocumentFormat[] = ["png", "jpg", "webp"]

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const DOCUMENT_ACCEPT = DOCUMENT_FORMATS.map(format => `.${format}`).concat(".jpeg").join(",")

// "Report.Final.PDF" -> "pdf"; "photo.jpeg" -> "jpg"; unknown -> null.
export function formatFromName (fileName: string): DocumentFormat | null {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (!ext || ext === fileName.toLowerCase()) return null
    const normalised = ext === "jpeg" ? "jpg" : ext
    return (DOCUMENT_FORMATS as readonly string[]).includes(normalised) ? normalised as DocumentFormat : null
}

// Display name only: no folders, control characters or characters that break file systems.
export function cleanFileName (fileName: string) {
    const base = fileName.split(/[\\/]/).pop() ?? ""
    return base.replace(/[\u0000-\u001f\u007f:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(-180)
}

// "AWS_cloud-practitioner.final.pdf" -> "AWS cloud practitioner.final"
export function titleFromFileName (fileName: string) {
    const withoutExt = fileName.replace(/\.[a-z0-9]{2,5}$/i, "")
    return (withoutExt.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled document").slice(0, 150)
}

const optional = (max: number) => z.string().trim().max(max, `Max ${max} characters`).nullish().transform(value => value || null)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date").nullish().transform(value => value || null)
const tags = z
    .array(z.string().trim().toLowerCase().min(1).max(30, "Tags are up to 30 characters"))
    .max(10, "Up to 10 tags")
    .default([])
    .transform(values => [...new Set(values)])

const datesInOrder = (value: { issued_on?: string | null, expires_on?: string | null }) =>
    !value.issued_on || !value.expires_on || value.expires_on >= value.issued_on
const datesMessage = { message: "The expiry date can't be before the issue date", path: ["expires_on"] }

export const documentDetailsSchema = z.object({
    title: z.string().trim().min(1, "Add a title").max(150),
    description: optional(2000),
    category: z.enum(DOCUMENT_GROUPS),
    tags,
    issued_on: date,
    expires_on: date,
    is_favorite: z.boolean().default(false),
}).strict().refine(datesInOrder, datesMessage)

export type DocumentDetails = z.infer<typeof documentDetailsSchema>

export const documentSignSchema = z.object({
    fileName: z.string().min(1).max(255),
    size: z.number().int().positive(),
})

export const documentCreateSchema = z.object({
    path: z.string().regex(/^inbox\/[0-9a-f-]{36}\.[a-z]{2,4}$/, "Invalid path"),
    fileName: z.string().min(1).max(255),
    title: z.string().trim().max(150).optional(),
    category: z.enum(DOCUMENT_GROUPS).default("other"),
}).strict()

export const SHARE_DURATIONS = [3600, 86400] as const
export const documentLinkSchema = z.object({
    purpose: z.enum(["preview", "download", "share"]),
    expiresIn: z.union([z.literal(3600), z.literal(86400)]).optional(),
}).strict()

export type DocumentRecord = DocumentDetails & {
    id: string
    file_name: string
    format: DocumentFormat
    size_bytes: number
    created_at: string
    updated_at: string
    // Signed thumbnail URL for image documents (1 hour), added by the list query.
    thumb_url?: string | null
}

// ---------------------------------------------------------------------------
// Filtering (shared by the API and the page, so both agree)
// ---------------------------------------------------------------------------
export const DOCUMENT_SORTS = ["newest", "oldest", "name", "size", "expiry"] as const
export type DocumentSort = (typeof DOCUMENT_SORTS)[number]

export const documentFilterSchema = z.object({
    q: z.string().max(100).catch("").default(""),
    group: z.enum(DOCUMENT_GROUPS).nullable().catch(null).default(null),
    favorites: z.boolean().catch(false).default(false),
    expiring: z.boolean().catch(false).default(false),
    sort: z.enum(DOCUMENT_SORTS).catch("newest").default("newest"),
})
export type DocumentFilter = z.infer<typeof documentFilterSchema>

export function parseDocumentFilter (params: URLSearchParams | Record<string, string | string[] | undefined>): DocumentFilter {
    const get = (key: string) => {
        const value = params instanceof URLSearchParams ? params.get(key) : params[key]
        return (Array.isArray(value) ? value[0] : value) ?? undefined
    }
    return documentFilterSchema.parse({
        q: get("q") ?? "",
        group: get("group") ?? null,
        favorites: get("favorites") === "1",
        expiring: get("expiring") === "1",
        sort: get("sort") ?? "newest",
    })
}

export const EXPIRY_WARNING_DAYS = 60

export const todayIso = () => new Date().toISOString().slice(0, 10)

// "expired" | "soon" (within 60 days) | null. `today` is YYYY-MM-DD.
export function expiryState (expiresOn: string | null | undefined, today: string) {
    if (!expiresOn) return null
    if (expiresOn < today) return "expired"
    const limit = new Date(`${today}T00:00:00Z`)
    limit.setUTCDate(limit.getUTCDate() + EXPIRY_WARNING_DAYS)
    return expiresOn <= limit.toISOString().slice(0, 10) ? "soon" : null
}

export function filterDocuments (documents: DocumentRecord[], filter: DocumentFilter, today: string) {
    const terms = filter.q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const result = documents.filter(document => {
        if (filter.group && document.category !== filter.group) return false
        if (filter.favorites && !document.is_favorite) return false
        if (filter.expiring && !expiryState(document.expires_on, today)) return false
        if (!terms.length) return true
        const haystack = `${document.title} ${document.file_name} ${document.description ?? ""} ${document.tags.join(" ")}`.toLowerCase()
        return terms.every(term => haystack.includes(term))
    })
    const byName = (a: DocumentRecord, b: DocumentRecord) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    switch (filter.sort) {
        case "oldest": return result.sort((a, b) => a.created_at.localeCompare(b.created_at))
        case "name": return result.sort(byName)
        case "size": return result.sort((a, b) => b.size_bytes - a.size_bytes)
        case "expiry": return result.sort((a, b) => (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999") || byName(a, b))
        default: return result.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
}

export function formatBytes (bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
