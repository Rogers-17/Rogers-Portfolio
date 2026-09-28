import Link from "next/link"
import { FaArrowRight } from "react-icons/fa"
import ProjectGrid from "@/components/projects/ProjectGrid"
import { getFeaturedProjects } from "@/lib/projects/queries"

export default async function Project () {
    const projects = await getFeaturedProjects()

    return (
        <section className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-24">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
                <div>
                    <h2 className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">My Works 🤩</h2>
                    <p className="mt-3 text-3xl font-bold leading-tight md:mt-5 md:text-4xl">Projects I worked on. <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">At a glance.</span>
                    </p>
                </div>
                <Link href="/projects" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:border-accent-1">
                    All Projects
                    <FaArrowRight size={11} />
                </Link>
            </div>

            <ProjectGrid projects={projects} />
        </section>
    )
}
