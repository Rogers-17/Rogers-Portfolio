import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { AiError } from "@/lib/ai/openrouter"
import { runAgentTurn } from "@/lib/agent/run"
import { agentRequestSchema } from "@/lib/agent/schemas"

// POST /api/admin/agent: one admin-assistant turn (Google ADK + Gemini).
// Returns the reply plus proposed changes; nothing is written until /api/admin/agent/confirm.

export const maxDuration = 60

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, agentRequestSchema)
    if (!parsed.success) return parsed.response

    try {
        const result = await runAgentTurn({ supabase: auth.ctx.supabase, userId: auth.ctx.user.id, messages: parsed.data.messages, signal: request.signal })
        return ok(result)
    } catch (error) {
        if (error instanceof AiError) return fail(error.status, error.code, error.message)
        console.error("[agent] turn failed:", error instanceof Error ? error.message : error)
        return fail(500, "server_error", "Something went wrong. Please try again.")
    }
}
