import { env } from "@/lib/env"

export type StorageBucket = "project-images" | "tech-icons"

export function publicImageUrl (bucket: StorageBucket, path: string | null): string | null {
    if (!path) return null
    const cleanPath = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")
    return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`
}
