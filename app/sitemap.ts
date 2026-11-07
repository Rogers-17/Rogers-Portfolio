import type { MetadataRoute } from "next"
import { getSitemapPosts } from "@/lib/blog/queries"
import { getSitemapProjects } from "@/lib/projects/queries"
import { safeCanonical } from "@/lib/seo"
import { absoluteUrl } from "@/lib/site"

// Cached route handler. Admin saves call revalidatePath("/sitemap.xml") (lib/admin/revalidate.ts);
// this hourly revalidate is only a backstop (e.g. a scheduled post going live).
export const revalidate = 3600

// Public, indexable routes only. Never: /admin, /api, /r, /d, drafts, unpublished projects,
// posts canonical to another site, or the noindex Coding Courses placeholder.
export default async function sitemap (): Promise<MetadataRoute.Sitemap> {
    const [projects, posts] = await Promise.all([getSitemapProjects(), getSitemapPosts()])

    const projectEntries = projects.map(project => ({
        url: absoluteUrl(`/projects/${project.slug}`),
        lastModified: new Date(project.updated_at),
    }))

    // A sitemap lists canonical URLs only, so posts first published elsewhere are left out.
    const postEntries = posts
        .filter(post => {
            const canonical = safeCanonical(post.canonical_url)
            return canonical === null || canonical === absoluteUrl(`/blog/${post.slug}`)
        })
        .map(post => ({ url: absoluteUrl(`/blog/${post.slug}`), lastModified: new Date(post.updated_at) }))

    // Listings take the newest child date; static pages carry no invented dates.
    const newest = (entries: { lastModified: Date }[]) =>
        entries.length ? new Date(Math.max(...entries.map(entry => entry.lastModified.getTime()))) : undefined

    return [
        { url: absoluteUrl("/") },
        { url: absoluteUrl("/about") },
        { url: absoluteUrl("/projects"), lastModified: newest(projectEntries) },
        ...projectEntries,
        { url: absoluteUrl("/blog"), lastModified: newest(postEntries) },
        ...postEntries,
        { url: absoluteUrl("/gallery") },
        { url: absoluteUrl("/start-a-project") },
    ]
}
