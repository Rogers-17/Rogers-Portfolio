import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { IMAGE_FORMATS, type DocumentRecord } from "@/lib/documents/schema"

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
