import "server-only"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
    DEFAULT_DESIGN,
    TEMPLATES,
    blankResume,
    designSchema,
    parseResumeData,
    tailorKeywordSchema,
    type ResumeRecord,
    type TemplateKey,
} from "@/lib/resume/schema"

// Admin-only, uncached reads (RLS: is_admin()). Resume data never goes through the public client.

const MIGRATION_HINT = "Run supabase/migrations/20261002000000_resume_builder.sql in the Supabase SQL Editor."

function fail (what: string, error: { message: string, code?: string }): never {
    const missing = error.code === "PGRST205" || error.code === "42P01"
    throw new Error(missing ? `The ${what} table doesn't exist yet. ${MIGRATION_HINT}` : `Failed to load ${what}: ${error.message}`)
}

const RESUME_COLUMNS = "id, title, target_role, template, design, data, job_description, job_company, tailor_keywords, is_archived, created_at, updated_at"

const rowSchema = z.object({
    id: z.string(),
    title: z.string(),
    target_role: z.string().nullable(),
    template: z.enum(TEMPLATES).catch("professional"),
    design: z.unknown(),
    data: z.unknown(),
    job_description: z.string().nullable(),
    job_company: z.string().nullable(),
    tailor_keywords: z.unknown(),
    is_archived: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
})

// Tolerant: a document that no longer validates (e.g. after a schema change) opens as blank
// sections rather than crashing the editor; the raw row stays untouched until you save.
function toRecord (row: z.infer<typeof rowSchema>): ResumeRecord {
    const data = parseResumeData(row.data)
    const design = designSchema.safeParse(row.design ?? {})
    const keywords = z.array(tailorKeywordSchema).safeParse(row.tailor_keywords)
    return {
        ...row,
        design: design.success ? design.data : DEFAULT_DESIGN,
        data: data.ok ? data.data : blankResume(),
        tailor_keywords: keywords.success ? keywords.data : [],
    }
}

export async function listResumes (supabase: SupabaseClient, archived = false): Promise<ResumeRecord[]> {
    const { data, error } = await supabase
        .from("resumes")
        .select(RESUME_COLUMNS)
        .eq("is_archived", archived)
        .order("updated_at", { ascending: false })
        .limit(200)
    if (error) fail("resumes", error)
    return z.array(rowSchema).parse(data).map(toRecord)
}

export async function getResume (supabase: SupabaseClient, id: string): Promise<ResumeRecord | null> {
    const { data, error } = await supabase.from("resumes").select(RESUME_COLUMNS).eq("id", id).maybeSingle()
    if (error) fail("resumes", error)
    return data ? toRecord(rowSchema.parse(data)) : null
}

export type ResumeSettings = { ai_model: string, daily_ai_limit: number, default_template: TemplateKey }

export const DEFAULT_RESUME_SETTINGS: ResumeSettings = { ai_model: "anthropic/claude-haiku-4.5", daily_ai_limit: 150, default_template: "professional" }

export async function getResumeSettings (supabase: SupabaseClient): Promise<ResumeSettings> {
    const { data, error } = await supabase.from("resume_settings").select("ai_model, daily_ai_limit, default_template").eq("id", 1).maybeSingle()
    if (error) fail("resume_settings", error)
    if (!data) return DEFAULT_RESUME_SETTINGS
    return {
        ai_model: String(data.ai_model),
        daily_ai_limit: Number(data.daily_ai_limit),
        default_template: (TEMPLATES as readonly string[]).includes(String(data.default_template)) ? data.default_template as TemplateKey : "professional",
    }
}

// Signed URL for a private resume photo (1 hour). Null if missing or unsigned.
export async function signPhoto (supabase: SupabaseClient, path: string | null): Promise<string | null> {
    if (!path) return null
    const { data, error } = await supabase.storage.from("resume-assets").createSignedUrl(path, 3600)
    if (error) {
        console.error("[resume] sign photo failed:", error.message)
        return null
    }
    return data.signedUrl
}

export function startOfTodayUtc () {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function aiRequestsToday (supabase: SupabaseClient): Promise<number> {
    const { count, error } = await supabase.from("ai_requests").select("id", { count: "exact", head: true }).gte("created_at", startOfTodayUtc())
    return error ? 0 : count ?? 0
}

// ---------------------------------------------------------------------------
// Cover letters
// ---------------------------------------------------------------------------

const letterSchema = z.object({
    id: z.string(),
    resume_id: z.string().nullable(),
    title: z.string(),
    company: z.string().nullable(),
    job_title: z.string().nullable(),
    sender_name: z.string().nullable().default(null),
    sender_contact: z.string().nullable().default(null),
    sender_address: z.string().nullable().default(null),
    recipient: z.string().nullable(),
    letter_date: z.string().nullable(),
    salutation: z.string().nullable().default(null),
    subject: z.string().nullable().default(null),
    body: z.string(),
    closing: z.string().nullable().default(null),
    style: z.enum(["formal", "resume"]).catch("formal"),
    created_at: z.string(),
    updated_at: z.string(),
})

export type CoverLetterRecord = z.infer<typeof letterSchema>

const LETTER_COLUMNS = "id, resume_id, title, company, job_title, sender_name, sender_contact, sender_address, recipient, letter_date, salutation, subject, body, closing, style, created_at, updated_at"

export async function listCoverLetters (supabase: SupabaseClient): Promise<CoverLetterRecord[]> {
    const { data, error } = await supabase.from("cover_letters").select(LETTER_COLUMNS).order("updated_at", { ascending: false }).limit(200)
    if (error) fail("cover_letters", error)
    return z.array(letterSchema).parse(data)
}

export async function getCoverLetter (supabase: SupabaseClient, id: string): Promise<CoverLetterRecord | null> {
    const { data, error } = await supabase.from("cover_letters").select(LETTER_COLUMNS).eq("id", id).maybeSingle()
    if (error) fail("cover_letters", error)
    return data ? letterSchema.parse(data) : null
}

// Totals for the last `days` days of AI requests (settings page).
export async function aiUsageStats (supabase: SupabaseClient, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from("ai_requests").select("prompt_tokens, completion_tokens, cost_usd").gte("created_at", since).limit(5000)
    return (data ?? []).reduce(
        (total, row) => ({
            requests: total.requests + 1,
            tokens: total.tokens + Number(row.prompt_tokens ?? 0) + Number(row.completion_tokens ?? 0),
            cost: total.cost + Number(row.cost_usd ?? 0),
        }),
        { requests: 0, tokens: 0, cost: 0 },
    )
}
