import "server-only"
import { revalidatePath, revalidateTag } from "next/cache"
import { PROJECTS_CACHE_TAG } from "@/lib/projects/cache"
import { EXPERIENCES_CACHE_TAG, TESTIMONIALS_CACHE_TAG } from "@/lib/content/cache"
import { BLOG_CACHE_TAG } from "@/lib/blog/schema"
import { ABOUT_CACHE_TAG, GALLERY_CACHE_TAG, PROJECT_FORM_CACHE_TAG } from "@/lib/pages/cache"

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

export function revalidateAbout () {
    revalidateTag(ABOUT_CACHE_TAG, { expire: 0 })
    revalidatePath("/about")
}

export function revalidateGallery () {
    revalidateTag(GALLERY_CACHE_TAG, { expire: 0 })
    revalidatePath("/gallery")
}

export function revalidateProjectForm () {
    revalidateTag(PROJECT_FORM_CACHE_TAG, { expire: 0 })
    revalidatePath("/start-a-project")
}

export function revalidateBlog () {
    revalidateTag(BLOG_CACHE_TAG, { expire: 0 })
    revalidatePath("/blog")
    revalidatePath("/blog/[slug]", "page")
}
