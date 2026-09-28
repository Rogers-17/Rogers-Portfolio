import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { sessionCookieOptions } from "@/lib/supabase/cookie-options"

// Cookie-bound client for admin pages and route handlers (acts as the signed-in user).
export async function createSessionClient () {
    const cookieStore = await cookies()

    return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        cookieOptions: sessionCookieOptions,
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                } catch {
                    // Called from a Server Component: cookies are read-only there; proxy.ts refreshes the session.
                }
            },
        },
    })
}

// Client for API callers that send `Authorization: Bearer <access_token>` (e.g. curl).
export function createBearerClient (accessToken: string) {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
}
