import "server-only"
import { unstable_cache } from "next/cache"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase/server"
import {
    PROJECT_CARD_COLUMNS,
    PROJECT_DETAIL_COLUMNS,
    projectCardSchema,
    projectDetailSchema,
    type ProjectCard,
    type ProjectDetail,
} from "@/lib/projects/schema"

export const PROJECTS_CACHE_TAG = "projects"
// Dev: near-instant so Supabase dashboard edits show on refresh. Prod: 60s until the
// admin dashboard (Phase 2) calls revalidateTag(PROJECTS_CACHE_TAG) on save.
const cacheOptions = {
    tags: [PROJECTS_CACHE_TAG],
    revalidate: process.env.NODE_ENV === "development" ? 1 : 60,
}

const FEATURED_LIMIT = 3

export const getPublishedProjects = unstable_cache(
    async (): Promise<ProjectCard[]> => {
        const { data, error } = await createServerSupabase()
            .from("projects")
            .select(PROJECT_CARD_COLUMNS)
            .eq("is_published", true)
            .order("sort_order", { ascending: true })
            .order("year", { ascending: false })

        if (error) throw new Error(`Failed to load projects: ${error.message}`)
        return z.array(projectCardSchema).parse(data)
    },
    ["projects:published"],
    cacheOptions,
)

export const getFeaturedProjects = unstable_cache(
    async (): Promise<ProjectCard[]> => {
        const { data, error } = await createServerSupabase()
            .from("projects")
            .select(PROJECT_CARD_COLUMNS)
            .eq("is_published", true)
            .eq("is_featured", true)
            .order("sort_order", { ascending: true })
            .limit(FEATURED_LIMIT)

        if (error) throw new Error(`Failed to load featured projects: ${error.message}`)
        return z.array(projectCardSchema).parse(data)
    },
    ["projects:featured"],
    cacheOptions,
)

export const getPublishedProjectSlugs = unstable_cache(
    async (): Promise<string[]> => {
        const { data, error } = await createServerSupabase()
            .from("projects")
            .select("slug")
            .eq("is_published", true)

        if (error) throw new Error(`Failed to load project slugs: ${error.message}`)
        return z.array(z.object({ slug: z.string() })).parse(data).map(row => row.slug)
    },
    ["projects:slugs"],
    cacheOptions,
)

const getProjectRow = unstable_cache(
    async (slug: string): Promise<ProjectDetail | null> => {
        const { data, error } = await createServerSupabase()
            .from("projects")
            .select(PROJECT_DETAIL_COLUMNS)
            .eq("slug", slug)
            .eq("is_published", true)
            .maybeSingle()

        if (error) throw new Error(`Failed to load project "${slug}": ${error.message}`)
        return data ? projectDetailSchema.parse(data) : null
    },
    ["projects:by-slug"],
    cacheOptions,
)

export type ProjectWithNeighbours = {
    project: ProjectDetail
    previous: ProjectCard | null
    next: ProjectCard | null
}

// Callers must validate `slug` with slugSchema first.
export async function getProjectBySlug (slug: string): Promise<ProjectWithNeighbours | null> {
    const [project, all] = await Promise.all([getProjectRow(slug), getPublishedProjects()])
    if (!project) return null

    const index = all.findIndex(card => card.slug === slug)
    if (all.length < 2 || index === -1) return { project, previous: null, next: null }

    return {
        project,
        previous: all[(index - 1 + all.length) % all.length],
        next: all[(index + 1) % all.length],
    }
}
