import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"
import { uploadBuckets, uploadFolderSchema } from "@/lib/admin/schemas"
import { BUCKET_RULES, isUnsafeSvg, sniffImage } from "@/lib/admin/uploads"
import { PRIVATE_BUCKETS, publicImageUrl, type StorageBucket } from "@/lib/storage"

const MAX_REQUEST_BYTES = 5 * 1024 * 1024 + 64 * 1024 // largest file + multipart overhead

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const declaredLength = Number(request.headers.get("content-length") ?? 0)
    if (declaredLength > MAX_REQUEST_BYTES) return fail(413, "too_large", "File is too large.")

    let form: FormData
    try {
        form = await request.formData()
    } catch {
        return fail(400, "invalid_form", "Expected multipart/form-data.")
    }

    const bucket = form.get("bucket")
    const folder = uploadFolderSchema.safeParse(form.get("folder"))
    const file = form.get("file")

    if (typeof bucket !== "string" || !(uploadBuckets as readonly string[]).includes(bucket)) {
        return fail(400, "invalid_bucket", "Unknown bucket.")
    }
    if (!folder.success) return fail(400, "invalid_folder", "Folder must be lowercase letters, numbers and dashes.")
    if (!(file instanceof File) || file.size === 0) return fail(400, "missing_file", "Choose a file to upload.")

    const rules = BUCKET_RULES[bucket as StorageBucket]
    if (file.size > rules.maxBytes) {
        return fail(413, "too_large", `File is too large (max ${Math.round(rules.maxBytes / 1024 / 1024)} MB).`)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const kind = sniffImage(bytes)
    if (!kind || !rules.allowed.includes(kind.ext)) {
        return fail(400, "invalid_type", `Unsupported file type. Allowed: ${rules.allowed.join(", ").toUpperCase()}.`)
    }
    if (kind.ext === "svg" && isUnsafeSvg(bytes)) {
        return fail(400, "unsafe_svg", "SVG contains scripts or event handlers and was rejected.")
    }

    // Server-generated name: the client's file name is never used.
    const path = `${folder.data}/${crypto.randomUUID()}.${kind.ext}`
    const { error } = await auth.ctx.supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType: kind.mime, cacheControl: "31536000", upsert: false })

    if (error) {
        console.error("[admin] upload failed:", error.message)
        return fail(500, "upload_failed", "Upload failed. Please try again.")
    }

    // Private buckets get a short-lived signed URL for the preview instead of a public one.
    if (PRIVATE_BUCKETS.includes(bucket as StorageBucket)) {
        const { data: signed, error: signError } = await auth.ctx.supabase.storage.from(bucket).createSignedUrl(path, 3600)
        if (signError) {
            console.error("[admin] sign upload failed:", signError.message)
            return fail(500, "upload_failed", "Upload failed. Please try again.")
        }
        return ok({ path, url: signed.signedUrl }, 201)
    }

    return ok({ path, url: publicImageUrl(bucket as StorageBucket, path) }, 201)
}
