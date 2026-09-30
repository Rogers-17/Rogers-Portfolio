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
