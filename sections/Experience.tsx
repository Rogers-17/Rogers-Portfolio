import ExperienceTimeline from "@/components/content/ExperienceTimeline"
import { getPublishedExperiences } from "@/lib/content/queries"

export default async function Experience () {
    const experiences = await getPublishedExperiences()

    return (
        <section className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
                <div>
                    <h2 className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">Experience</h2>
                    <p className="text-3xl md:text-4xl mt-3 md:mt-5 font-bold">My journey <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">So far</span>
                    </p>
                </div>
                <p className="max-w-md text-muted leading-relaxed">
                    Years of pairing design thinking with clean, scalable code across fintech, SaaS, and startups.
                </p>
            </div>

            <ExperienceTimeline experiences={experiences} />
        </section>
    )
}
