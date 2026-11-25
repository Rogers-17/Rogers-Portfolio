import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

const chunkSchema = z.string().trim().min(1).max(12000)
const schema = z.object({
    provider: z.enum(["chatgpt", "claude"]), sourceName: z.string().trim().min(1).max(240), externalId: z.string().trim().min(1).max(240),
    title: z.string().trim().min(1).max(500), conversationDate: z.string().datetime().nullable().optional(), chunks: z.array(chunkSchema).min(1).max(200),
}).refine(value => value.chunks.reduce((sum, chunk) => sum + chunk.length, 0) <= 2_400_000, { message: "A conversation can contain at most 2.4 million characters." })

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = await parseJson(request, schema)
    if (!parsed.success) return parsed.response
    const db = auth.ctx.supabase
    const item = parsed.data
    const { data: source, error: sourceError } = await db.from("agent_memory_sources").upsert({
        user_id: auth.ctx.user.id, provider: item.provider, source_name: item.sourceName, external_id: item.externalId,
        title: item.title, conversation_date: item.conversationDate ?? null,
    }, { onConflict: "user_id,provider,external_id" }).select("id").single()
    if (sourceError || !source) return sourceError ? dbError(sourceError, "save assistant memory source") : fail(500, "save_failed", "Couldn't save this conversation.")
    const { error: clearError } = await db.from("agent_memory_chunks").delete().eq("source_id", source.id).eq("user_id", auth.ctx.user.id)
    if (clearError) return dbError(clearError, "replace assistant memory chunks")
    const chunks = item.chunks.map((content, chunk_index) => ({ source_id: source.id, user_id: auth.ctx.user.id, chunk_index, content }))
    const { error: chunksError } = await db.from("agent_memory_chunks").insert(chunks)
    if (chunksError) return dbError(chunksError, "store assistant memory chunks")
    return ok({ id: source.id, title: item.title, chunks: chunks.length }, 201)
}
