import Image from "next/image"
import Link from "next/link"
import type { ProjectCard as ProjectCardData } from "@/lib/projects/schema"
import ImagePlaceholder from "@/components/projects/ImagePlaceholder"
import StatusBadge from "@/components/projects/StatusBadge"

export default function ProjectCard ({ project }: { project: ProjectCardData }) {
    return (
        <Link
            href={`/projects/${project.slug}`}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent-1 focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        >
            <div className="relative aspect-[7/8] overflow-hidden rounded-xl bg-card">
                {project.coverImageUrl ? (
                    <Image
                        src={project.coverImageUrl}
                        alt={project.coverImageAlt}
                        fill
                        sizes="(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <ImagePlaceholder label={project.name} />
                )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-bold">{project.name}</h3>
                <span className="rounded-md bg-linear-65/srgb from-accent-1 to-accent-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {project.type}
                </span>
            </div>
            <StatusBadge status={project.status} className="mt-3 text-sm text-muted" />
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{project.summary}</p>
        </Link>
    )
}
