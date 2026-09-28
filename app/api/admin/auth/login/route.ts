import { createSessionClient } from "@/lib/supabase/session"
import { isSameOrigin } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { loginSchema } from "@/lib/admin/schemas"

export async function POST (request: Request) {
    if (!isSameOrigin(request)) return fail(403, "forbidden_origin", "Cross-origin request blocked.")

    const parsed = await parseJson(request, loginSchema)
    if (!parsed.success) return parsed.response

    const supabase = await createSessionClient()
    const { error } = await supabase.auth.signInWithPassword(parsed.data)
    if (error?.status === 429) return fail(429, "rate_limited", "Too many sign-in attempts. Please wait a few minutes and try again.")
    // Same message for unknown email and wrong password (no account enumeration).
    if (error) return fail(401, "invalid_credentials", "Invalid email or password.")

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin")
    if (adminError) {
        await supabase.auth.signOut()
        return fail(503, "auth_unavailable", "Sign-in service is temporarily unavailable. Please try again.")
    }
    if (isAdmin !== true) {
        await supabase.auth.signOut()
        return fail(403, "forbidden", "This account doesn't have admin access.")
    }

    return ok({ signedIn: true })
}
