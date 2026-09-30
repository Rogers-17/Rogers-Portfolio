import { fail, ok, zodIssues } from "@/lib/admin/http"
import { hashIp } from "@/lib/project-request/rate-limit"
import { projectRequestBodySchema, projectRequestSchema } from "@/lib/project-request/schema"
import { createAnonSupabase } from "@/lib/supabase/server"

const MAX_BODY_BYTES = 16 * 1024
const MIN_FILL_MS = 3000

// Public: saves a Start-a-project request. Anti-spam: body cap, honeypot, minimum fill time,
// and a per-IP / site-wide rate limit enforced in the database (submit_project_request).
export async function POST (request: Request) {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
        return fail(415, "unsupported_media_type", "Send the request as JSON.")
    }
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
        return fail(413, "too_large", "Request is too large.")
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) return fail(413, "too_large", "Request is too large.")

    let body: unknown
    try {
        body = JSON.parse(raw)
    } catch {
        return fail(400, "invalid_json", "Request body must be valid JSON.")
    }

    const meta = projectRequestBodySchema.safeParse(body)
    if (!meta.success) return fail(400, "invalid_json", "Request body must be a JSON object.")

    // Bots: pretend it worked, store nothing.
    const startedAt = meta.data.started_at
    const tooFast = !startedAt || startedAt > Date.now() || Date.now() - startedAt < MIN_FILL_MS
    if (meta.data.website || tooFast) return ok({ id: crypto.randomUUID() }, 201)

    const parsed = projectRequestSchema.safeParse(body)
    if (!parsed.success) return fail(400, "validation_error", "Some fields are invalid.", zodIssues(parsed.error))

    const { data, error } = await createAnonSupabase().rpc("submit_project_request", {
        payload: parsed.data,
        p_ip_hash: hashIp(request),
    })

    if (error) {
        if (error.message.includes("rate_limited")) {
            return fail(429, "rate_limited", "You've sent a few requests already. Please try again in an hour, or reach out directly.")
        }
        if (error.code === "23514" || error.code === "22P02" || error.code === "22007" || error.code === "22008") {
            return fail(400, "invalid_input", "Some values are not allowed.")
        }
        console.error("[project-requests] submit failed:", error.code, error.message)
        return fail(500, "server_error", "Couldn't save your request. Please try again.")
    }

    return ok({ id: data as string }, 201)
}
