import { fail, ok } from "@/lib/admin/http"
import { hashIp } from "@/lib/project-request/rate-limit"
import { resolveShare } from "@/lib/resume/shares"
import { createAnonSupabase } from "@/lib/supabase/server"

// Public: the frozen resume behind a share link. Invalid, expired and revoked links all get
// the same 404, so a guessed token reveals nothing.

type Context = { params: Promise<{ token: string }> }

export async function GET (request: Request, context: Context) {
    const { token } = await context.params
    const result = await resolveShare(createAnonSupabase(), token, hashIp(request))
    if (result === "rate_limited") return fail(429, "rate_limited", "Too many requests. Try again later.")
    if (!result) return fail(404, "not_found", "This link has expired or been turned off.")
    const response = ok(result)
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    return response
}
