import type { CookieOptionsWithName } from "@supabase/ssr"

// All auth happens server-side, so the session cookie never needs to be readable by JS.
export const sessionCookieOptions: CookieOptionsWithName = {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
}
