import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"
import { sessionCookieOptions } from "@/lib/supabase/cookie-options"
import { isTransientAuthError } from "@/lib/supabase/auth-errors"

// Refreshes the Supabase session cookie and does an *optimistic* redirect for signed-out
// visitors. Real authorization happens in every admin page/route (lib/admin/auth.ts) and in RLS.
export async function proxy (request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        cookieOptions: sessionCookieOptions,
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll (cookiesToSet, headers) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                response = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
            },
        },
    })

    const { data, error } = await supabase.auth.getClaims()
    const isSignedIn = Boolean(data?.claims?.sub)
    const { pathname, search } = request.nextUrl


    // Only redirect when there is definitely no session. On a temporary Auth failure
    // (e.g. 429) let the request through: the page itself decides and shows an error.
    const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login"
    if (isAdminPage && !isSignedIn && !isTransientAuthError(error)) {
        const loginUrl = new URL("/admin/login", request.url)
        loginUrl.searchParams.set("next", `${pathname}${search}`)
        return NextResponse.redirect(loginUrl)
    }

    return response
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
}
