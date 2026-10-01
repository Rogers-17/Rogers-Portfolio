import { after } from "next/server"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"
import { DOCUMENTS_BUCKET, cleanupInbox, documentUsage, getDocument, listDocuments, readDocumentSample } from "@/lib/documents/queries"
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, cleanFileName, documentCreateSchema, filterDocuments, formatFromName, parseDocumentFilter, titleFromFileName, todayIso } from "@/lib/documents/schema"
import { sniffDocument } from "@/lib/documents/sniff"

// GET /api/admin/documents?q=&group=&favorites=1&expiring=1&sort=newest
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const all = await listDocuments(supabase).catch(() => null)
    if (!all) return fail(500, "server_error", "Couldn't load documents.")
    after(() => cleanupInbox(supabase))

    const filter = parseDocumentFilter(new URL(request.url).searchParams)
    return ok({ documents: filterDocuments(all, filter, todayIso()), usage: documentUsage(all) })
}

// POST: verify an uploaded inbox file (size + real contents), move it into files/ and save it.
// A failed check deletes the file; a failed read leaves it for a retry (or the inbox clean-up).
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const parsed = await parseJson(request, documentCreateSchema)
    if (!parsed.success) return parsed.response
    const { path, category } = parsed.data
    const storage = supabase.storage.from(DOCUMENTS_BUCKET)

    const removeQuietly = async (target: string) => {
        const { error } = await storage.remove([target])
        if (error) console.error("[documents] cleanup failed:", error.message)
    }
    const reject = async (status: number, code: string, message: string) => {
        await removeQuietly(path)
        return fail(status, code, message)
    }

    const fileName = cleanFileName(parsed.data.fileName)
    const format = formatFromName(fileName)
    const declared = path.split(".").pop()
    if (!fileName || !format || format !== declared) return reject(400, "invalid_type", "The file name doesn't match the uploaded file.")

    // Size from the stored object; contents from its first and last 64 KB (never a full download).
    const { data: info, error: infoError } = await storage.info(path)
    if (infoError || !info) return fail(404, "not_found", "Upload not found. Please try again.")
    const size = info.size ?? 0
    if (size > MAX_DOCUMENT_BYTES) return reject(413, "too_large", `File is too large (max ${MAX_DOCUMENT_MB} MB).`)
    if (size <= 0) return reject(400, "empty_file", "The file is empty.")

    const sample = await readDocumentSample(supabase, path, size)
    if (!sample) return fail(502, "upload_failed", "Couldn't check the file. Please try again.")
    if (!sniffDocument(sample, format)) return reject(400, "invalid_type", `This file isn't a valid ${format.toUpperCase()}. Check the file and try again.`)

    const finalPath = path.replace(/^inbox\//, "files/")
    const { error: moveError } = await storage.move(path, finalPath)
    if (moveError) {
        console.error("[documents] move failed:", moveError.message)
        return reject(500, "upload_failed", "Couldn't save the file. Please try again.")
    }

    const { data, error } = await supabase
        .from("documents")
        .insert({
            title: parsed.data.title?.trim() || titleFromFileName(fileName),
            category,
            file_path: finalPath,
            file_name: fileName,
            format,
            size_bytes: size,
        })
        .select("id")
        .single()
    if (error) {
        await removeQuietly(finalPath)
        return dbError(error, "create document")
    }

    const document = await getDocument(supabase, data.id)
    return ok(document, 201)
}
