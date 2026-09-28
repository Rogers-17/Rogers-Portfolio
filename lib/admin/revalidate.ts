import "server-only"
import { revalidatePath, revalidateTag } from "next/cache"
import { PROJECTS_CACHE_TAG } from "@/lib/projects/cache"

// Expire cached project data immediately and regenerate public pages on their next visit.
export function revalidateProjects () {
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 })
    revalidatePath("/")
    revalidatePath("/projects")
    revalidatePath("/projects/[slug]", "page")
}
