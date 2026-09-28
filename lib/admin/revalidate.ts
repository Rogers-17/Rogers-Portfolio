import "server-only"
import { revalidatePath, revalidateTag } from "next/cache"
import { PROJECTS_CACHE_TAG } from "@/lib/projects/cache"
import { EXPERIENCES_CACHE_TAG, TESTIMONIALS_CACHE_TAG } from "@/lib/content/cache"

// Expire cached data immediately and regenerate public pages on their next visit.
export function revalidateProjects () {
    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 })
    revalidatePath("/")
    revalidatePath("/projects")
    revalidatePath("/projects/[slug]", "page")
}

export function revalidateTestimonials () {
    revalidateTag(TESTIMONIALS_CACHE_TAG, { expire: 0 })
    revalidatePath("/")
}

export function revalidateExperiences () {
    revalidateTag(EXPERIENCES_CACHE_TAG, { expire: 0 })
    revalidatePath("/")
}
