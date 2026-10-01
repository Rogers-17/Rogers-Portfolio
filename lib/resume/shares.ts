import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_DESIGN, TEMPLATES, designSchema, parseResumeData, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

// Private share links. The token is 32 random bytes (base64url, 43 chars) and is only ever
// returned once; the database stores its SHA-256 hash.

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function hashToken (token: string) {
    return createHash("sha256").update(token).digest("hex")
}

export function newToken () {
    return randomBytes(32).toString("base64url")
}

export const shareCreateSchema = z.object({
    label: z.string().trim().max(80).nullish().transform(value => value || null),
    expires_in_days: z.union([z.literal(7), z.literal(30), z.null()]),
    allow_download: z.boolean(),
    // JPEG made in the (signed-in) browser from the private photo; ≤ ~300 KB.
    photo_data: z
        .string()
        .max(420_000, "Photo is too large")
        .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/, "Invalid photo")
        .refine(value => Buffer.from(value.slice(23, 31), "base64").subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), "Invalid photo")
        .nullish()
        .transform(value => value ?? null),
})

const shareRowSchema = z.object({
    id: z.string(),
    label: z.string().nullable(),
    allow_download: z.boolean(),
    expires_at: z.string().nullable(),
    revoked_at: z.string().nullable(),
    view_count: z.number(),
    last_viewed_at: z.string().nullable(),
    created_at: z.string(),
})

export type ShareListItem = z.infer<typeof shareRowSchema>

export async function listShares (supabase: SupabaseClient, resumeId: string): Promise<ShareListItem[]> {
    const { data, error } = await supabase
        .from("resume_shares")
        .select("id, label, allow_download, expires_at, revoked_at, view_count, last_viewed_at, created_at")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(100)
    if (error) throw new Error(`Failed to load share links: ${error.message}`)
    return z.array(shareRowSchema).parse(data)
}

export type SharedResume = {
    title: string
    template: TemplateKey
    design: ResumeDesign
    data: ResumeData
    allowDownload: boolean
    photoData: string | null
}

// Anonymous look-up through the security-definer RPC (validates expiry and revocation).
export async function resolveShare (supabase: SupabaseClient, token: string, viewerHash: string): Promise<SharedResume | "rate_limited" | null> {
    if (!TOKEN_PATTERN.test(token)) return null
    const { data, error } = await supabase.rpc("resolve_resume_share", { p_token_hash: hashToken(token), p_viewer_hash: viewerHash })
    if (error) {
        if (error.message.includes("rate_limited")) return "rate_limited"
        console.error("[share] resolve failed:", error.code, error.message)
        return null
    }
    if (!data || typeof data !== "object") return null

    const row = data as { title: string, template: string, design: unknown, data: unknown, allow_download: boolean, photo_data: string | null }
    const document = parseResumeData(row.data)
    if (!document.ok) return null
    const design = designSchema.safeParse(row.design)
    return {
        title: row.title,
        template: (TEMPLATES as readonly string[]).includes(row.template) ? row.template as TemplateKey : "professional",
        design: design.success ? design.data : DEFAULT_DESIGN,
        data: { ...document.data, contact: { ...document.data.contact, photoPath: null } },
        allowDownload: row.allow_download,
        photoData: typeof row.photo_data === "string" && row.photo_data.startsWith("data:image/jpeg;base64,") ? row.photo_data : null,
    }
}
