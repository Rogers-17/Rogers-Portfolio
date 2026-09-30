// Browser-side: upload a file straight to Supabase Storage (bypassing Vercel's ~4.5 MB
// request limit). The server approves the upload first and verifies the stored file after.

import { adminFetch, type ApiResult } from "@/lib/admin/client"
import type { StorageBucket } from "@/lib/storage"

export const MAX_UPLOAD_MB = 10

export async function directUpload (bucket: StorageBucket, folder: string, file: File): Promise<ApiResult<{ path: string, url: string }>> {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        return { ok: false, error: { code: "too_large", message: `File is too large (max ${MAX_UPLOAD_MB} MB).` } }
    }

    const signed = await adminFetch<{ path: string, signedUrl: string }>("/api/admin/uploads/sign", {
        json: { bucket, folder, contentType: file.type || "application/octet-stream", size: file.size },
    })
    if (!signed.ok) return signed

    try {
        const body = new FormData()
        body.append("cacheControl", "31536000")
        body.append("", file)
        const response = await fetch(signed.data.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } })
        if (!response.ok) {
            const payload = await response.json().catch(() => null) as { message?: string, error?: string } | null
            const detail = payload?.message ?? payload?.error ?? ""
            const message = /size|large/i.test(detail) ? `File is too large (max ${MAX_UPLOAD_MB} MB).` : /mime|type/i.test(detail) ? "That file type isn't allowed here." : "Upload failed. Please try again."
            return { ok: false, error: { code: "upload_failed", message } }
        }
    } catch {
        return { ok: false, error: { code: "network", message: "Network error during upload. Check your connection and try again." } }
    }

    return adminFetch<{ path: string, url: string }>("/api/admin/uploads/confirm", { json: { bucket, path: signed.data.path } })
}
