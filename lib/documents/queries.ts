import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { IMAGE_FORMATS, type DocumentRecord } from "@/lib/documents/schema"
import type { DocumentSample } from "@/lib/documents/sniff"

export const DOCUMENTS_BUCKET = "documents"

const COLUMNS = "id, title, description, category, tags, file_path, file_name, format, size_bytes, issued_on, expires_on, is_favorite, created_at, updated_at"
const THUMB_SECONDS = 3600

type Row = DocumentRecord & { file_path: string }

// The storage path stays on the server; the browser only ever gets signed URLs.
function toRecord (row: Row, thumbUrl: string | null = null): DocumentRecord {
    const record: DocumentRecord & { file_path?: string } = { ...row, thumb_url: thumbUrl }
    delete record.file_path
    return record
}

export async function listDocuments (supabase: SupabaseClient): Promise<DocumentRecord[]> {
    const { data, error } = await supabase.from("documents").select(COLUMNS).order("created_at", { ascending: false }).limit(2000)
    if (error) {
        console.error("[documents] list failed:", error.message)
        throw new Error("Couldn't load documents.")
    }
    const rows = (data ?? []) as Row[]

    // One batch request signs every image thumbnail.
    const images = rows.filter(row => IMAGE_FORMATS.includes(row.format))
    const thumbs = new Map<string, string>()
    if (images.length) {
        const { data: signed, error: signError } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrls(images.map(row => row.file_path), THUMB_SECONDS)
        if (signError) console.error("[documents] thumbnail signing failed:", signError.message)
        for (const entry of signed ?? []) if (entry.path && entry.signedUrl) thumbs.set(entry.path, entry.signedUrl)
    }
    return rows.map(row => toRecord(row, thumbs.get(row.file_path) ?? null))
}

export async function getDocumentRow (supabase: SupabaseClient, id: string): Promise<Row | null> {
    const { data, error } = await supabase.from("documents").select(COLUMNS).eq("id", id).maybeSingle()
    if (error) {
        console.error("[documents] get failed:", error.message)
        return null
    }
    return data as Row | null
}

export async function getDocument (supabase: SupabaseClient, id: string): Promise<DocumentRecord | null> {
    const row = await getDocumentRow(supabase, id)
    return row ? toRecord(row) : null
}

export function documentUsage (documents: DocumentRecord[]) {
    return { count: documents.length, bytes: documents.reduce((sum, document) => sum + document.size_bytes, 0) }
}

// Uploads that were signed but never saved (tab closed mid-upload) are removed after a day.
export async function cleanupInbox (supabase: SupabaseClient) {
    const storage = supabase.storage.from(DOCUMENTS_BUCKET)
    const { data, error } = await storage.list("inbox", { limit: 100, sortBy: { column: "created_at", order: "asc" } })
    if (error) return console.error("[documents] inbox list failed:", error.message)
    const cutoff = Date.now() - 24 * 3600 * 1000
    const stale = (data ?? []).filter(file => file.id && file.created_at && new Date(file.created_at).getTime() < cutoff).map(file => `inbox/${file.name}`)
    if (!stale.length) return
    const { error: removeError } = await storage.remove(stale)
    if (removeError) console.error("[documents] inbox cleanup failed:", removeError.message)
}

// ---------------------------------------------------------------------------
// Reading a sample of a stored file without downloading it in full
// ---------------------------------------------------------------------------
const SAMPLE_BYTES = 64 * 1024
const RANGE_TIMEOUT_MS = 15_000

function concat (chunks: Uint8Array[]) {
    const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
    let offset = 0
    for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.byteLength
    }
    return out
}

// Reads a response body keeping at most `limit` bytes: the first ones, or the last ones.
async function readBounded (body: ReadableStream<Uint8Array>, limit: number, keep: "first" | "last") {
    const reader = body.getReader()
    let chunks: Uint8Array[] = []
    let total = 0
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            total += value.byteLength
            if (keep === "first" && total >= limit) break
            if (keep === "last" && total > limit * 2) {
                const joined = concat(chunks)
                chunks = [joined.slice(joined.byteLength - limit)]
                total = limit
            }
        }
    } finally {
        reader.cancel().catch(() => {})
    }
    const joined = concat(chunks)
    return keep === "first" ? joined.slice(0, limit) : joined.slice(Math.max(0, joined.byteLength - limit))
}

async function fetchRange (url: string, start: number, end: number) {
    const length = end - start + 1
    const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, cache: "no-store", signal: AbortSignal.timeout(RANGE_TIMEOUT_MS) })
    if (!response.ok || !response.body) throw new Error(`range read failed (${response.status})`)
    // 206 = only the range came back; 200 = the server ignored Range and sent the whole file.
    if (response.status === 206) return readBounded(response.body, length, "first")
    return readBounded(response.body, length, start === 0 ? "first" : "last")
}

// The first and last 64 KB of a stored file (the whole file when it's 128 KB or less).
export async function readDocumentSample (supabase: SupabaseClient, path: string, size: number): Promise<DocumentSample | null> {
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 60)
    if (error || !data) {
        console.error("[documents] sample signing failed:", error?.message)
        return null
    }
    try {
        if (size <= SAMPLE_BYTES * 2) {
            return { head: await fetchRange(data.signedUrl, 0, size - 1), tail: new Uint8Array(), truncated: false }
        }
        const [head, tail] = await Promise.all([
            fetchRange(data.signedUrl, 0, SAMPLE_BYTES - 1),
            fetchRange(data.signedUrl, size - SAMPLE_BYTES, size - 1),
        ])
        return { head, tail, truncated: true }
    } catch (failure) {
        console.error("[documents] sample read failed:", failure instanceof Error ? failure.message : "unknown")
        return null
    }
}
