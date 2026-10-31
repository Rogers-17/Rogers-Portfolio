import "server-only"
import { randomInt } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DOCUMENTS_BUCKET } from "@/lib/documents/queries"
import type { DocumentShare } from "@/lib/documents/schema"
import { hashToken } from "@/lib/resume/shares"
import { createAnonSupabase, createServiceSupabase, hasServiceKey } from "@/lib/supabase/server"

// Share links for private documents. They go on CVs, so the token is short and has no
// look-alike characters (0/o, 1/l/i). It's only ever returned once; the database stores its
// SHA-256 hash, and the lookup is rate-limited per visitor.

const TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
const TOKEN_LENGTH = 10
const TOKEN_PATTERN = /^[2-9a-hjkmnp-z]{10}$/
const SIGNED_URL_SECONDS = 60

export function newDocumentToken () {
    return Array.from({ length: TOKEN_LENGTH }, () => TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]).join("")
}

export async function listDocumentShares (supabase: SupabaseClient, documentId: string): Promise<DocumentShare[]> {
    const { data, error } = await supabase
        .from("document_shares")
        .select("id, label, expires_at, revoked_at, open_count, last_opened_at, created_at")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(100)
    if (error) throw new Error(`Failed to load share links: ${error.message}`)
    return data as DocumentShare[]
}

// Anonymous look-up through the security-definer RPC (validates expiry and revocation), then a
// 60-second signed URL. Expiring a link blocks new opens straight away; nothing long-lived leaks.
export async function resolveDocumentShare (token: string, viewerHash: string): Promise<string | "rate_limited" | null> {
    const normalised = token.toLowerCase()
    if (!TOKEN_PATTERN.test(normalised)) return null
    if (!hasServiceKey()) {
        console.error("[documents] SUPABASE_SECRET_KEY is not set; share links can't open.")
        return null
    }

    const { data, error } = await createAnonSupabase().rpc("resolve_document_share", { p_token_hash: hashToken(normalised), p_viewer_hash: viewerHash })
    if (error) {
        if (error.message.includes("rate_limited")) return "rate_limited"
        console.error("[documents] share resolve failed:", error.code, error.message)
        return null
    }
    if (!data || typeof data !== "object") return null

    const row = data as { file_path: string, file_name: string }
    const { data: signed, error: signError } = await createServiceSupabase().storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_SECONDS, { download: row.file_name })
    if (signError || !signed) {
        console.error("[documents] share signing failed:", signError?.message)
        return null
    }
    return signed.signedUrl
}
