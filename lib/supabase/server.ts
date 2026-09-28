import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { PROJECTS_CACHE_TAG, PROJECTS_REVALIDATE_SECONDS } from "@/lib/projects/cache"

// Public, read-only client: uses the publishable key, so RLS decides what is visible.
// Its requests go through Next's fetch cache tagged "projects", which admin saves expire
// immediately with revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 }).
export function createServerSupabase () {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            fetch: (input, init) => fetch(input, {
                ...init,
                cache: "force-cache",
                next: { tags: [PROJECTS_CACHE_TAG], revalidate: PROJECTS_REVALIDATE_SECONDS },
            }),
        },
    })
}
