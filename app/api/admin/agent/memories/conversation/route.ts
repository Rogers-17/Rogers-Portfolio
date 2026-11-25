import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get("id"))
    if (!id.success) return fail(400, "invalid_id", "Choose a saved conversation.")
    const db = auth.ctx.supabase
    const { data: source, error } = await db.from("agent_memory_sources").select("id,provider,source_name,title,conversation_date").eq("id", id.data).eq("user_id", auth.ctx.user.id).maybeSingle()
    if (error) return dbError(error, "load memory source")
    if (!source) return fail(404, "not_found", "Memory source not found.")
    const { data: chunks, error: chunkError } = await db.from("agent_memory_chunks").select("chunk_index,content").eq("source_id", source.id).eq("user_id", auth.ctx.user.id).order("chunk_index")
    if (chunkError) return dbError(chunkError, "load memory transcript")
    return ok({ ...source, content: chunks.map(row => row.content).join("\n\n") })
}
