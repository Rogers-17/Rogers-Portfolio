import "server-only"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

// Public, read-only client: uses the publishable key, so RLS decides what is visible.
export function createServerSupabase () {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}
