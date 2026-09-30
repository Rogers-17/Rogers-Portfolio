import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { uploadBuckets, uploadFolderSchema } from "@/lib/admin/schemas"
import { BUCKET_RULES, MIME_TO_EXT } from "@/lib/admin/uploads"
import type { StorageBucket } from "@/lib/storage"

// Step 1 of a direct upload: the server approves the upload (bucket, folder, type, size) and
// returns a one-time signed URL. The browser then sends the file straight to Supabase, so
// files up to 10 MB never pass through Vercel's ~4.5 MB request limit.
// Step 2 is POST /api/admin/uploads/confirm, which checks the real file contents.

const bodySchema = z.object({
    bucket: z.enum(uploadBuckets),
    folder: uploadFolderSchema,
    contentType: z.string().max(100),
    size: z.number().int().positive(),
})

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, bodySchema)
    if (!parsed.success) return parsed.response
    const { bucket, folder, contentType, size } = parsed.data

    const rules = BUCKET_RULES[bucket as StorageBucket]
    if (size > rules.maxBytes) return fail(413, "too_large", `File is too large (max ${Math.round(rules.maxBytes / 1024 / 1024)} MB).`)

    const ext = MIME_TO_EXT[contentType.toLowerCase()]
    if (!ext || !rules.allowed.includes(ext)) {
        return fail(400, "invalid_type", `Unsupported file type. Allowed: ${rules.allowed.join(", ").toUpperCase()}.`)
    }
    if (ext === "pdf" && folder !== "imports") return fail(400, "invalid_type", "PDFs can only be uploaded for CV imports.")

    // Server-generated name: the client's file name is never used.
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await auth.ctx.supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (error) {
        console.error("[admin] sign upload failed:", error.message)
        return fail(500, "upload_failed", "Couldn't start the upload. Please try again.")
    }

    return ok({ path, signedUrl: data.signedUrl }, 201)
}
