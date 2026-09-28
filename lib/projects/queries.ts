import "server-only"
import { cache } from "react"
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

export { PROJECTS_CACHE_TAG } from "@/lib/projects/cache"

const FEATURED_LIMIT = 3

// React cache() dedupes calls within one render (e.g. generateMetadata + page); cross-request
// caching is Next's tagged fetch cache configured in lib/supabase/server.ts.

export const getPublishedProjects = cache(
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
)

export const getFeaturedProjects = cache(
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
)

export const getPublishedProjectSlugs = cache(
    async (): Promise<string[]> => {
        const { data, error } = await createServerSupabase()
            .from("projects")
            .select("slug")
            .eq("is_published", true)

        if (error) throw new Error(`Failed to load project slugs: ${error.message}`)
        return z.array(z.object({ slug: z.string() })).parse(data).map(row => row.slug)
    },
)

const getProjectRow = cache(
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
