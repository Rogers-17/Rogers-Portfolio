import { requireAdminApi } from "@/lib/admin/auth"
import { parseJson } from "@/lib/admin/http"
import { toResponse } from "@/lib/admin/actions/result"
import { executeProposal } from "@/lib/agent/proposals"
import { confirmRequestSchema } from "@/lib/agent/schemas"

// POST /api/admin/agent/confirm: runs one change the owner confirmed in the assistant.
// No AI involved: the payload is re-validated and saved through the shared admin actions.
export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    const parsed = await parseJson(request, confirmRequestSchema)
    if (!parsed.success) return parsed.response

    const { proposal } = parsed.data
    const result = await executeProposal(auth.ctx.supabase, proposal)
    if (!result.ok) return toResponse(result)
    return toResponse({ ok: true, data: { id: proposal.targetId ?? (result.data as { id?: string })?.id ?? null, type: proposal.type, op: proposal.op, label: proposal.label } })
}
