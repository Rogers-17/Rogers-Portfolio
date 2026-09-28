import "server-only"
import { redirect } from "next/navigation"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createBearerClient, createSessionClient } from "@/lib/supabase/session"
import { fail } from "@/lib/admin/http"
import { isTransientAuthError } from "@/lib/supabase/auth-errors"

export type AdminContext = { supabase: SupabaseClient, user: User }

const UNAVAILABLE = "Sign-in service is temporarily unavailable. Please wait a minute and try again."

type AdminCheck = "admin" | "not_admin" | "unavailable"

async function checkAdmin (supabase: SupabaseClient): Promise<AdminCheck> {
    const { data, error } = await supabase.rpc("is_admin")
    if (error) {
        console.error("[admin] is_admin check failed:", error.code, error.message)
        return "unavailable"
    }
    return data === true ? "admin" : "not_admin"
}

// Server Components: verifies the session with the Auth server, then the admin allowlist.
// Temporary failures (rate limits, outages) throw to the error boundary instead of
// redirecting to /admin/login, so a flaky Auth response can never cause a redirect loop.
export async function requireAdminPage (): Promise<AdminContext> {
    const supabase = await createSessionClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (isTransientAuthError(error)) {
        console.error("[admin] getUser failed:", error?.name, error?.status, error?.message)
        throw new Error(UNAVAILABLE)
    }
    if (!user) redirect("/admin/login")

    const admin = await checkAdmin(supabase)
    if (admin === "unavailable") throw new Error(UNAVAILABLE)
    if (admin === "not_admin") redirect("/admin/login?error=forbidden")

    return { supabase, user }
}

type ApiAuth = { ok: true, ctx: AdminContext } | { ok: false, response: Response }

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Route Handlers: accepts a bearer token (API clients) or the session cookie (dashboard).
export async function requireAdminApi (request: Request): Promise<ApiAuth> {
    const authorization = request.headers.get("authorization")
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

    let supabase: SupabaseClient
    let result: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>

    if (bearer) {
        supabase = createBearerClient(bearer)
        result = await supabase.auth.getUser(bearer)
    } else {
        // Cookies are sent automatically by browsers, so cookie-authenticated writes must be same-origin (CSRF).
        if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
            return { ok: false, response: fail(403, "forbidden_origin", "Cross-origin request blocked.") }
        }
        supabase = await createSessionClient()
        result = await supabase.auth.getUser()
    }

    if (isTransientAuthError(result.error)) {
        console.error("[admin] getUser failed:", result.error?.name, result.error?.status, result.error?.message)
        return { ok: false, response: fail(503, "auth_unavailable", UNAVAILABLE) }
    }
    const user = result.data.user
    if (!user) return { ok: false, response: fail(401, "unauthorized", "Sign in required.") }

    const admin = await checkAdmin(supabase)
    if (admin === "unavailable") return { ok: false, response: fail(503, "auth_unavailable", UNAVAILABLE) }
    if (admin === "not_admin") return { ok: false, response: fail(403, "forbidden", "Admin access required.") }

    return { ok: true, ctx: { supabase, user } }
}

export function isSameOrigin (request: Request) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
    if (!origin || !host) return false
    try {
        return new URL(origin).host === host
    } catch {
        return false
    }
}
