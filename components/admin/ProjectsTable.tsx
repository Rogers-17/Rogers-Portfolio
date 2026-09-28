"use client"

import ContentList, { type ListItem } from "@/components/admin/ContentList"
import type { AdminProjectRow } from "@/lib/admin/queries"
import { PROJECT_STATUS_LABELS } from "@/lib/projects/shared"

const FEATURED_ON_HOMEPAGE = 3

function toItem (project: AdminProjectRow): ListItem {
    return {
        id: project.id,
        title: project.name,
        subtitle: `/projects/${project.slug}`,
        meta: `${project.project_type} · ${project.year} · ${PROJECT_STATUS_LABELS[project.status]} · updated ${new Date(project.updated_at).toLocaleDateString()}`,
        imageUrl: project.coverImageUrl,
        initials: project.name.slice(0, 2).toUpperCase(),
        editHref: `/admin/projects/${project.id}`,
        viewHref: project.is_published ? `/projects/${project.slug}` : null,
        switches: [
            { field: "is_published", label: "Published", checked: project.is_published },
            { field: "is_featured", label: "Featured", checked: project.is_featured },
        ],
    }
}

function FeaturedNotice (items: ListItem[]) {
    const featured = items.filter(item => item.switches.every(entry => entry.checked)).length
    if (featured <= FEATURED_ON_HOMEPAGE) return null
    return (
        <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {featured} published projects are featured, but the homepage shows only the first {FEATURED_ON_HOMEPAGE} in this order.
        </p>
    )
}

export default function ProjectsTable ({ initialProjects }: { initialProjects: AdminProjectRow[] }) {
    return (
        <ContentList
            items={initialProjects.map(toItem)}
            endpoint="/api/admin/projects"
            itemLabel="Project"
            emptyTitle="No projects yet"
            emptyHint="Create your first project to show it on the site."
            newHref="/admin/projects/new"
            notice={FeaturedNotice}
        />
    )
}
