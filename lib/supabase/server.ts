import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { PROJECTS_CACHE_TAG, PROJECTS_REVALIDATE_SECONDS } from "@/lib/projects/cache"

// Public, read-only client: uses the publishable key, so RLS decides what is visible.
// Its requests go through Next's fetch cache under `tag`, which admin saves expire
// immediately with revalidateTag(tag, { expire: 0 }) (see lib/admin/revalidate.ts).
export function createServerSupabase (tag: string = PROJECTS_CACHE_TAG) {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            fetch: (input, init) => fetch(input, {
                ...init,
                cache: "force-cache",
                next: { tags: [tag], revalidate: PROJECTS_REVALIDATE_SECONDS },
            }),
        },
    })
}

// Public client for writes/RPCs: same publishable key (RLS applies), but never cached.
export function createAnonSupabase () {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
}

export const hasServiceKey = () => Boolean(process.env.SUPABASE_SECRET_KEY)

// Bypasses RLS. Its one job is signing a shared document's file after the link has been
// validated (lib/documents/shares.ts); everything else uses the clients above.
export function createServiceSupabase () {
    const key = process.env.SUPABASE_SECRET_KEY
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.")
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
}
