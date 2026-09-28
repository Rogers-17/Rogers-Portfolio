import { z } from "zod"

const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

// NEXT_PUBLIC_* vars must be referenced explicitly so Next can inline them.
const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})

if (!parsed.success) {
    const missing = parsed.error.issues.map(issue => issue.path.join(".")).join(", ")
    throw new Error(`Invalid or missing environment variables: ${missing}. Copy .env.example to .env.local and fill them in.`)
}

export const env = parsed.data
