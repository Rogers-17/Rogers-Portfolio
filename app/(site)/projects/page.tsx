import type { Metadata } from "next"
import ProjectGrid from "@/components/projects/ProjectGrid"
import { getPublishedProjects } from "@/lib/projects/queries"

export const revalidate = 60

export const metadata: Metadata = {
    title: "Projects | Rogers Portfolio",
    description: "Software, websites and products designed and built by Rogers.",
}

export default async function ProjectsPage () {
    const projects = await getPublishedProjects()

    return (
        <main className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 pt-10 pb-24">
            <h1 className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">My Works 🤩</h1>
            <p className="mt-3 text-3xl font-bold leading-tight md:mt-5 md:text-4xl">All projects. <br />
                <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">Things I&apos;ve built.</span>
            </p>

            <ProjectGrid projects={projects} />
        </main>
    )
}
