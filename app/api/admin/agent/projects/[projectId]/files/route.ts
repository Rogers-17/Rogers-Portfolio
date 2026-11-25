import { z } from "zod"
import { extractText, getDocumentProxy } from "unpdf"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

export const maxDuration = 60

const schema = z.object({ path: z.string().max(500), fileName: z.string().trim().min(1).max(240), contentType: z.enum(["text/plain", "text/markdown", "application/pdf"]), size: z.number().int().positive().max(10 * 1024 * 1024) })

export async function GET (request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { projectId } = await params
    const { data, error } = await auth.ctx.supabase.from("agent_project_files").select("id,file_name,content_type,size_bytes,created_at").eq("project_id", projectId).eq("user_id", auth.ctx.user.id).order("created_at", { ascending: false })
    if (error) return dbError(error, "list project files")
    return ok(data)
}

export async function POST (request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { projectId } = await params
    const { data: project, error: projectError } = await auth.ctx.supabase.from("agent_projects").select("id").eq("id", projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (projectError) return dbError(projectError, "verify project file")
    if (!project) return fail(404, "not_found", "Project not found.")
    const ext = parsed.data.contentType === "application/pdf" ? "pdf" : parsed.data.contentType === "text/markdown" ? "md" : "txt"
    if (parsed.data.path !== `${auth.ctx.user.id}/${projectId}/${parsed.data.path.split("/").at(-1)}` || !new RegExp(`^[0-9a-f-]{36}\\.${ext}$`, "i").test(parsed.data.path.split("/").at(-1) ?? "")) return fail(400, "invalid_path", "Invalid project file upload.")
    const storage = auth.ctx.supabase.storage.from("agent-project-files")
    const reject = async (status: number, code: string, message: string) => {
        await storage.remove([parsed.data.path])
        return fail(status, code, message)
    }
    const { data: info, error: infoError } = await storage.info(parsed.data.path)
    if (infoError || !info || info.size !== parsed.data.size || info.size > 10 * 1024 * 1024) return reject(400, "invalid_upload", "Uploaded file size does not match the approved file.")
    const { data: blob, error: downloadError } = await storage.download(parsed.data.path)
    if (downloadError || !blob) return reject(404, "not_found", "Uploaded project file not found.")
    let text = ""
    if (parsed.data.contentType === "application/pdf") {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return reject(400, "invalid_file", "That file is not a valid PDF.")
        try {
            const pdf = await getDocumentProxy(bytes)
            if (pdf.numPages > 100) return reject(400, "too_many_pages", "PDFs up to 100 pages are supported.")
            const parsedPdf = await extractText(pdf, { mergePages: true })
            text = parsedPdf.text
        } catch {
            return reject(400, "invalid_file", "The PDF could not be read. Check that it is not password-protected or damaged.")
        }
    } else {
        text = await blob.text()
        if (text.includes("\u0000")) return reject(400, "invalid_file", "That file is not valid text.")
    }
    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    if (!text) return reject(400, "no_text", "No searchable text was found in that file.")
    if (text.length > 200000) return reject(413, "too_large", "Project files can contain at most 200,000 searchable characters.")
    const { data, error } = await auth.ctx.supabase.from("agent_project_files").insert({
        user_id: auth.ctx.user.id, project_id: projectId, file_name: parsed.data.fileName, storage_path: parsed.data.path,
        content_type: parsed.data.contentType, size_bytes: parsed.data.size, extracted_text: text,
    }).select("id,file_name,content_type,size_bytes,created_at").single()
    if (error) {
        await storage.remove([parsed.data.path])
        return dbError(error, "save project file")
    }
    return ok(data, 201)
}
