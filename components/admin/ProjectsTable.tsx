"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { FiArrowDown, FiArrowUp, FiEdit2, FiExternalLink } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import type { AdminProjectRow } from "@/lib/admin/queries"
import { PROJECT_STATUS_LABELS } from "@/lib/projects/shared"
import { Switch, iconButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"

const FEATURED_ON_HOMEPAGE = 3

export default function ProjectsTable ({ initialProjects }: { initialProjects: AdminProjectRow[] }) {
    const [projects, setProjects] = React.useState(initialProjects)
    const [busy, setBusy] = React.useState(false)
    const { notify } = useToast()

    const featuredCount = projects.filter(project => project.is_featured && project.is_published).length

    async function toggle (id: string, field: "is_published" | "is_featured", value: boolean) {
        const previous = projects
        setProjects(current => current.map(project => (project.id === id ? { ...project, [field]: value } : project)))

        const result = await adminFetch(`/api/admin/projects/${id}/toggle`, { json: { field, value } })
        if (!result.ok) {
            setProjects(previous)
            notify(result.error.message, "error")
        }
    }

    async function move (index: number, direction: -1 | 1) {
        const target = index + direction
        if (target < 0 || target >= projects.length) return

        const previous = projects
        const reordered = [...projects]
        ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
        setProjects(reordered)
        setBusy(true)

        const result = await adminFetch("/api/admin/projects/reorder", { json: { ids: reordered.map(project => project.id) } })
        setBusy(false)
        if (!result.ok) {
            setProjects(previous)
            notify(result.error.message, "error")
        }
    }

    if (projects.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
                <p className="font-semibold">No projects yet</p>
                <p className="mt-1 text-sm text-muted">Create your first project to show it on the site.</p>
                <Link href="/admin/projects/new" className="mt-5 inline-block text-sm font-bold text-accent-1 hover:underline">New project →</Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {featuredCount > FEATURED_ON_HOMEPAGE && (
                <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {featuredCount} published projects are featured, but the homepage shows only the first {FEATURED_ON_HOMEPAGE} in this order.
                </p>
            )}

            <ul className="flex flex-col gap-3">
                {projects.map((project, index) => (
                    <li key={project.id} className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-card p-4 md:flex-row md:items-center">
                        <div className="flex items-center gap-4 md:flex-1 md:min-w-0">
                            <div className="flex flex-col gap-1">
                                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Move ${project.name} up`} className={iconButtonClass}>
                                    <FiArrowUp aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === projects.length - 1} aria-label={`Move ${project.name} down`} className={iconButtonClass}>
                                    <FiArrowDown aria-hidden="true" />
                                </button>
                            </div>

                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white/6">
                                {project.coverImageUrl ? (
                                    <Image src={project.coverImageUrl} alt="" fill sizes="56px" className="object-cover" />
                                ) : (
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted">{project.name.slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <Link href={`/admin/projects/${project.id}`} className="block truncate font-bold hover:text-accent-1">{project.name}</Link>
                                <p className="truncate text-xs text-dim">/projects/{project.slug}</p>
                                <p className="mt-1 text-xs text-muted">
                                    {project.project_type} · {project.year} · {PROJECT_STATUS_LABELS[project.status]} · updated {new Date(project.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
                            <label className="flex items-center gap-2 text-sm text-muted">
                                <Switch checked={project.is_published} onChange={value => toggle(project.id, "is_published", value)} label={`Published: ${project.name}`} />
                                Published
                            </label>
                            <label className="flex items-center gap-2 text-sm text-muted">
                                <Switch checked={project.is_featured} onChange={value => toggle(project.id, "is_featured", value)} label={`Featured: ${project.name}`} />
                                Featured
                            </label>
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/projects/${project.id}`} aria-label={`Edit ${project.name}`} className={iconButtonClass}>
                                    <FiEdit2 aria-hidden="true" />
                                </Link>
                                {project.is_published && (
                                    <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.name} on the site`} className={iconButtonClass}>
                                        <FiExternalLink aria-hidden="true" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
