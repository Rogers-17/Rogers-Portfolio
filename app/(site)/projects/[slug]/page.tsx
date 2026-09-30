import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FiArrowDown, FiArrowLeft, FiArrowRight, FiChevronLeft, FiExternalLink } from "react-icons/fi"
import LetsWorkCTA from "@/sections/LetsWorkCTA"
import DetailSection from "@/components/projects/DetailSection"
import FeatureAccordion from "@/components/projects/FeatureAccordion"
import ImagePlaceholder from "@/components/projects/ImagePlaceholder"
import Prose from "@/components/projects/Prose"
import StatusBadge from "@/components/projects/StatusBadge"
import TechGrid from "@/components/projects/TechGrid"
import { getProjectBySlug, getPublishedProjectSlugs } from "@/lib/projects/queries"
import { slugSchema, type ProjectCard } from "@/lib/projects/schema"

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams () {
    const slugs = await getPublishedProjectSlugs()
    return slugs.map(slug => ({ slug }))
}

async function loadProject (params: Props["params"]) {
    const { slug } = await params
    const parsed = slugSchema.safeParse(slug)
    if (!parsed.success) notFound()

    const result = await getProjectBySlug(parsed.data)
    if (!result) notFound()
    return result
}

export async function generateMetadata ({ params }: Props): Promise<Metadata> {
    const { project } = await loadProject(params)
    return {
        title: `${project.name} | Rogers Portfolio`,
        description: project.summary,
        openGraph: {
            title: `${project.name} — ${project.tagline}`,
            description: project.summary,
            images: project.coverImageUrl ? [{ url: project.coverImageUrl, alt: project.coverImageAlt }] : undefined,
        },
    }
}

const proseClass = "text-base leading-[1.9] text-muted"

export default async function ProjectDetailPage ({ params }: Props) {
    const { project, previous, next } = await loadProject(params)

    const meta = [
        { label: "Year", value: String(project.year) },
        { label: "Type", value: project.type },
        { label: "Client", value: project.client },
        { label: "Role", value: project.role },
    ].filter((cell): cell is { label: string, value: string } => Boolean(cell.value))

    const hasTechSection = Boolean(project.techIntro || project.techBreakdown.length || project.technologies.length)

    return (
        <>
            <main className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 pt-10">
                <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-white">
                    <FiChevronLeft aria-hidden="true" />
                    All Projects
                </Link>

                <h1 className="mt-8 text-3xl font-bold leading-tight md:text-[2.5rem]">
                    {project.name} — {project.tagline}
                </h1>

                <dl className="mt-10 grid grid-cols-2 gap-y-6 border-y border-white/6 py-7 md:grid-cols-5">
                    {meta.map(cell => (
                        <div key={cell.label}>
                            <dt className="text-sm uppercase text-muted">{cell.label}</dt>
                            <dd className="mt-2 font-semibold">{cell.value}</dd>
                        </div>
                    ))}
                    <div>
                        <dt className="text-sm uppercase text-muted">Status</dt>
                        <dd className="mt-2 font-semibold"><StatusBadge status={project.status} /></dd>
                    </div>
                </dl>

                <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-2xl bg-card">
                    {project.coverImageUrl ? (
                        <Image
                            src={project.coverImageUrl}
                            alt={project.coverImageAlt}
                            fill
                            priority
                            sizes="(min-width: 1200px) 1040px, 100vw"
                            className="object-cover"
                        />
                    ) : (
                        <ImagePlaceholder label={project.name} />
                    )}
                </div>

                {project.overview && (
                    <Prose text={project.overview} className="mt-12 text-lg leading-[1.85] text-muted md:w-3/5" />
                )}

                {(project.problem || project.websiteUrl) && (
                    <div className="mt-8 flex flex-wrap gap-4">
                        {project.problem && (
                            <a href="#problem" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:border-accent-1">
                                Continue Reading
                                <FiArrowDown aria-hidden="true" />
                            </a>
                        )}
                        {project.websiteUrl && (
                            <a
                                href={project.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(222,14,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(222,14,255,0.5)]"
                            >
                                Visit Website
                                <FiExternalLink aria-hidden="true" />
                            </a>
                        )}
                    </div>
                )}

                <div className="mt-20 border-t border-white/6">
                    {project.problem && (
                        <DetailSection id="problem" title="The Problem">
                            <Prose text={project.problem} className={proseClass} />
                        </DetailSection>
                    )}

                    {project.solution && (
                        <DetailSection title="The Solution">
                            <Prose text={project.solution} className={proseClass} />
                        </DetailSection>
                    )}

                    {project.devRole && (
                        <DetailSection title="My Role">
                            <Prose text={project.devRole} className={proseClass} />
                        </DetailSection>
                    )}

                    {project.features.length > 0 && (
                        <DetailSection title="Features">
                            <FeatureAccordion features={project.features} />
                        </DetailSection>
                    )}

                    {project.gallery.length > 0 && (
                        <DetailSection title="Gallery">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {project.gallery.map(image => (
                                    <Image
                                        key={image.id}
                                        src={image.url}
                                        alt={image.alt}
                                        width={1200}
                                        height={900}
                                        sizes="(min-width: 768px) 25vw, 100vw"
                                        className="h-auto w-full rounded-xl"
                                    />
                                ))}
                            </div>
                        </DetailSection>
                    )}

                    {project.monetization && (
                        <DetailSection title="Monetization Model">
                            <Prose text={project.monetization} className={proseClass} />
                        </DetailSection>
                    )}

                    {hasTechSection && (
                        <DetailSection title="Technologies Used">
                            <div className={proseClass}>
                                {project.techIntro && <p>{project.techIntro}</p>}
                                {project.techBreakdown.map(row => (
                                    <p key={row.id} className="mt-5 first:mt-0">
                                        <strong className="font-bold text-fg/90">{row.label}:</strong> {row.description}
                                    </p>
                                ))}
                            </div>
                            {project.technologies.length > 0 && <TechGrid technologies={project.technologies} />}
                        </DetailSection>
                    )}

                    {project.projectSummary && (
                        <DetailSection title="Project Summary">
                            <Prose text={project.projectSummary} className={proseClass} />
                        </DetailSection>
                    )}
                </div>

                {previous && next && (
                    <nav aria-label="More projects" className="mt-6 grid gap-10 border-t border-white/6 pt-10 md:grid-cols-2">
                        <NeighbourLink project={previous} direction="previous" />
                        <NeighbourLink project={next} direction="next" />
                    </nav>
                )}
            </main>

            <LetsWorkCTA />
        </>
    )
}

function NeighbourLink ({ project, direction }: { project: ProjectCard, direction: "previous" | "next" }) {
    const isNext = direction === "next"
    return (
        <Link href={`/projects/${project.slug}`} className={`group block ${isNext ? "md:text-right" : ""}`}>
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
                {!isNext && <FiArrowLeft aria-hidden="true" />}
                {isNext ? "Next Project" : "Previous Project"}
                {isNext && <FiArrowRight aria-hidden="true" />}
            </span>
            <span className="mt-3 block text-2xl font-bold transition-colors duration-300 group-hover:text-accent-1">{project.name}</span>
            <span className={`mt-3 block max-w-md text-sm leading-relaxed text-muted ${isNext ? "md:ml-auto" : ""}`}>{project.summary}</span>
        </Link>
    )
}
