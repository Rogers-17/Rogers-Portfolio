export type StorageBucket = "project-images" | "tech-icons" | "site-images" | "resume-assets"

// Private buckets are only readable through short-lived signed URLs (never publicImageUrl).
export const PRIVATE_BUCKETS: readonly StorageBucket[] = ["resume-assets"]

// Client-safe: NEXT_PUBLIC_SUPABASE_URL is inlined at build time (validated at startup in lib/env.ts).
export function publicImageUrl (bucket: StorageBucket, path: string | null | undefined): string | null {
    if (!path) return null
    const cleanPath = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`
}
