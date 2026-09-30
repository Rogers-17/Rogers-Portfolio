import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { uploadBuckets } from "@/lib/admin/schemas"
import { BUCKET_RULES, isUnsafeSvg, sniffImage } from "@/lib/admin/uploads"
import { PRIVATE_BUCKETS, publicImageUrl, type StorageBucket } from "@/lib/storage"

// Step 2 of a direct upload: read the stored file back and check its real type (magic
// bytes), size and, for SVGs, active content. Anything that fails is deleted immediately.

const bodySchema = z.object({
    bucket: z.enum(uploadBuckets),
    path: z.string().regex(/^[a-z0-9-]{1,60}\/[0-9a-f-]{36}\.(png|jpg|webp|avif|gif|svg|pdf)$/, "Invalid path"),
})

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response
    const { bucket, path } = parsed.data
    const rules = BUCKET_RULES[bucket as StorageBucket]
    const storage = supabase.storage.from(bucket)

    const { data: blob, error } = await storage.download(path)
    if (error || !blob) return fail(404, "not_found", "Upload not found. Please try again.")

    const reject = async (status: number, code: string, message: string) => {
        const { error: removeError } = await storage.remove([path])
        if (removeError) console.error("[admin] rejected upload cleanup failed:", removeError.message)
        return fail(status, code, message)
    }

    if (blob.size > rules.maxBytes) return reject(413, "too_large", `File is too large (max ${Math.round(rules.maxBytes / 1024 / 1024)} MB).`)

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const kind = sniffImage(bytes)
    const declared = path.split(".").pop()
    if (!kind || !rules.allowed.includes(kind.ext) || kind.ext !== declared) {
        return reject(400, "invalid_type", `The file isn't a valid ${declared?.toUpperCase()}. Allowed: ${rules.allowed.join(", ").toUpperCase()}.`)
    }
    if (kind.ext === "svg" && isUnsafeSvg(bytes)) return reject(400, "unsafe_svg", "SVG contains scripts or event handlers and was rejected.")

    if (PRIVATE_BUCKETS.includes(bucket as StorageBucket)) {
        const { data: signed, error: signError } = await storage.createSignedUrl(path, 3600)
        if (signError) return fail(500, "upload_failed", "Upload failed. Please try again.")
        return ok({ path, url: signed.signedUrl })
    }
    return ok({ path, url: publicImageUrl(bucket as StorageBucket, path) })
}
