import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"

const schema = z.object({ fileName: z.string().trim().min(1).max(240), contentType: z.enum(["text/plain", "text/markdown", "application/pdf"]), size: z.number().int().positive().max(10 * 1024 * 1024) })
const extensions = { "text/plain": "txt", "text/markdown": "md", "application/pdf": "pdf" } as const

export async function POST (request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const { projectId } = await params
    const { data: project, error: projectError } = await auth.ctx.supabase.from("agent_projects").select("id").eq("id", projectId).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (projectError) return fail(500, "project_unavailable", "Couldn't verify the project.")
    if (!project) return fail(404, "not_found", "Project not found.")
    const path = `${auth.ctx.user.id}/${projectId}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`
    const { data, error } = await auth.ctx.supabase.storage.from("agent-project-files").createSignedUploadUrl(path)
    if (error) return fail(500, "upload_failed", "Couldn't start the project file upload.")
    return ok({ path, token: data.token, contentType: parsed.data.contentType }, 201)
}
