import "server-only"
import { randomInt } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DOCUMENTS_BUCKET } from "@/lib/documents/queries"
import { DOCUMENT_FORMATS, type DocumentFormat, type DocumentShare } from "@/lib/documents/schema"
import { hashToken } from "@/lib/resume/shares"
import { createAnonSupabase, createServiceSupabase, hasServiceKey } from "@/lib/supabase/server"

// Share links for private documents. They go on CVs, so the token is short and has no
// look-alike characters (0/o, 1/l/i). It's only ever returned once; the database stores its
// SHA-256 hash, and the lookup is rate-limited per visitor.

const TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
const TOKEN_LENGTH = 10
const TOKEN_PATTERN = /^[2-9a-hjkmnp-z]{10}$/

// Viewing loads the file once, so 5 minutes is plenty; a download starts straight away.
const SIGNED_URL_SECONDS = { view: 300, download: 60 } as const

export type ShareKind = keyof typeof SIGNED_URL_SECONDS

export type ResolvedShare = {
    url: string
    title: string
    fileName: string
    format: DocumentFormat
    size: number
}

export function newDocumentToken () {
    return Array.from({ length: TOKEN_LENGTH }, () => TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]).join("")
}

export async function listDocumentShares (supabase: SupabaseClient, documentId: string): Promise<DocumentShare[]> {
    const { data, error } = await supabase
        .from("document_shares")
        .select("id, label, expires_at, revoked_at, open_count, download_count, last_opened_at, created_at")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(100)
    if (error) throw new Error(`Failed to load share links: ${error.message}`)
    return data as DocumentShare[]
}

// Anonymous look-up through the security-definer RPC (validates expiry and revocation, counts
// the view or download), then a short-lived signed URL. Expiring a link blocks new lookups
// straight away; the storage path never leaves the server.
export async function resolveDocumentShare (token: string, viewerHash: string, kind: ShareKind): Promise<ResolvedShare | "rate_limited" | null> {
    const normalised = token.toLowerCase()
    if (!TOKEN_PATTERN.test(normalised)) return null
    if (!hasServiceKey()) {
        console.error("[documents] SUPABASE_SECRET_KEY is not set; share links can't open.")
        return null
    }

    const { data, error } = await createAnonSupabase().rpc("resolve_document_share", { p_token_hash: hashToken(normalised), p_viewer_hash: viewerHash, p_kind: kind })
    if (error) {
        if (error.message.includes("rate_limited")) return "rate_limited"
        console.error("[documents] share resolve failed:", error.code, error.message)
        return null
    }
    if (!data || typeof data !== "object") return null

    const row = data as { title: string, file_path: string, file_name: string, format: string, size_bytes: number }
    if (!(DOCUMENT_FORMATS as readonly string[]).includes(row.format)) return null
    const { data: signed, error: signError } = await createServiceSupabase().storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_SECONDS[kind], kind === "download" ? { download: row.file_name } : undefined)
    if (signError || !signed) {
        console.error("[documents] share signing failed:", signError?.message)
        return null
    }
    return { url: signed.signedUrl, title: row.title, fileName: row.file_name, format: row.format as DocumentFormat, size: row.size_bytes }
}
