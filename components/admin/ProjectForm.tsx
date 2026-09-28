"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiArrowDown, FiArrowUp, FiExternalLink, FiPlus, FiTrash2, FiX } from "react-icons/fi"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { LIMITS, projectInputSchema, type ProjectInput } from "@/lib/admin/schemas"
import type { AdminProjectDetail, AdminTechnology } from "@/lib/admin/queries"
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, slugify, type ProjectStatus } from "@/lib/projects/shared"
import { publicImageUrl } from "@/lib/storage"
import ImageUpload from "@/components/admin/ImageUpload"
import { Card, SelectField, Switch, TextAreaField, TextField, iconButtonClass, inputClass, secondaryButtonClass } from "@/components/admin/Field"
import SaveBar from "@/components/admin/SaveBar"
import { useScrollToFirstError, useUnsavedGuard } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"

type FeatureState = { key: string, title: string, description: string, image_path: string | null, image_url: string | null, image_alt: string }
type GalleryState = { key: string, image_path: string, image_url: string, alt: string }
type BreakdownState = { key: string, label: string, description: string }

type FormState = {
    name: string
    slug: string
    tagline: string
    summary: string
    project_type: string
    niche: string
    year: string
    client: string
    role: string
    status: ProjectStatus
    website_url: string
    cover_image_path: string | null
    cover_image_url: string | null
    cover_image_alt: string
    overview: string
    problem: string
    solution: string
    dev_role: string
    monetization: string
    tech_intro: string
    project_summary: string
    is_published: boolean
    is_featured: boolean
    features: FeatureState[]
    gallery: GalleryState[]
    tech_breakdown: BreakdownState[]
    technology_ids: string[]
}

const newKey = () => crypto.randomUUID()

function toFormState (project?: AdminProjectDetail): FormState {
    if (!project) {
        return {
            name: "", slug: "", tagline: "", summary: "", project_type: "Software", niche: "",
            year: String(new Date().getFullYear()), client: "", role: "", status: "active", website_url: "",
            cover_image_path: null, cover_image_url: null, cover_image_alt: "",
            overview: "", problem: "", solution: "", dev_role: "", monetization: "", tech_intro: "", project_summary: "",
            is_published: false, is_featured: false, features: [], gallery: [], tech_breakdown: [], technology_ids: [],
        }
    }
    return {
        name: project.name,
        slug: project.slug,
        tagline: project.tagline,
        summary: project.summary,
        project_type: project.project_type,
        niche: project.niche ?? "",
        year: String(project.year),
        client: project.client ?? "",
        role: project.role ?? "",
        status: project.status,
        website_url: project.website_url ?? "",
        cover_image_path: project.cover_image_path,
        cover_image_url: publicImageUrl("project-images", project.cover_image_path),
        cover_image_alt: project.cover_image_alt ?? "",
        overview: project.overview ?? "",
        problem: project.problem ?? "",
        solution: project.solution ?? "",
        dev_role: project.dev_role ?? "",
        monetization: project.monetization ?? "",
        tech_intro: project.tech_intro ?? "",
        project_summary: project.project_summary ?? "",
        is_published: project.is_published,
        is_featured: project.is_featured,
        features: project.features.map(feature => ({
            key: newKey(),
            title: feature.title,
            description: feature.description ?? "",
            image_path: feature.image_path,
            image_url: publicImageUrl("project-images", feature.image_path),
            image_alt: feature.image_alt ?? "",
        })),
        gallery: project.gallery.map(image => ({
            key: newKey(),
            image_path: image.image_path,
            image_url: publicImageUrl("project-images", image.image_path) ?? "",
            alt: image.alt,
        })),
        tech_breakdown: project.tech_breakdown.map(row => ({ key: newKey(), ...row })),
        technology_ids: project.technology_ids,
    }
}

function toPayload (state: FormState): unknown {
    return {
        name: state.name,
        slug: state.slug,
        tagline: state.tagline,
        summary: state.summary,
        project_type: state.project_type,
        niche: state.niche,
        year: state.year.trim() === "" ? undefined : Number(state.year),
        client: state.client,
        role: state.role,
        status: state.status,
        website_url: state.website_url,
        cover_image_path: state.cover_image_path,
        cover_image_alt: state.cover_image_alt,
        overview: state.overview,
        problem: state.problem,
        solution: state.solution,
        dev_role: state.dev_role,
        monetization: state.monetization,
        tech_intro: state.tech_intro,
        project_summary: state.project_summary,
        is_published: state.is_published,
        is_featured: state.is_featured,
        features: state.features.map(({ title, description, image_path, image_alt }) => ({ title, description, image_path, image_alt })),
        gallery: state.gallery.map(({ image_path, alt }) => ({ image_path, alt })),
        tech_breakdown: state.tech_breakdown.map(({ label, description }) => ({ label, description })),
        technology_ids: state.technology_ids,
    }
}

function moveItem<T> (items: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction
    if (target < 0 || target >= items.length) return items
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
}

const PARAGRAPH_HINT = "Leave a blank line between paragraphs."

type Props = { project?: AdminProjectDetail & { id: string }, technologies: AdminTechnology[] }

export default function ProjectForm ({ project, technologies }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const isNew = !project

    const [state, setState] = React.useState<FormState>(() => toFormState(project))
    const [slugTouched, setSlugTouched] = React.useState(!isNew)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)
    const [techQuery, setTechQuery] = React.useState("")
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(toPayload(state)))

    const isDirty = JSON.stringify(toPayload(state)) !== savedSnapshot
    const uploadFolder = state.slug || "drafts"

    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    function set<K extends keyof FormState> (key: K, value: FormState[K]) {
        setState(current => ({ ...current, [key]: value }))
    }

    function setName (name: string) {
        setState(current => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }))
    }

    function updateFeature (key: string, patch: Partial<FeatureState>) {
        set("features", state.features.map(feature => (feature.key === key ? { ...feature, ...patch } : feature)))
    }

    function updateGallery (key: string, patch: Partial<GalleryState>) {
        set("gallery", state.gallery.map(image => (image.key === key ? { ...image, ...patch } : image)))
    }

    function updateBreakdown (key: string, patch: Partial<BreakdownState>) {
        set("tech_breakdown", state.tech_breakdown.map(row => (row.key === key ? { ...row, ...patch } : row)))
    }

    async function handleSave () {
        const parsed = projectInputSchema.safeParse(toPayload(state))
        if (!parsed.success) {
            setErrors(issuesToRecord(parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))))
            notify("Fix the highlighted fields.", "error")
            return
        }

        setErrors({})
        setSaving(true)
        const payload: ProjectInput = parsed.data
        const result = await adminFetch<{ id: string, slug: string }>(
            isNew ? "/api/admin/projects" : `/api/admin/projects/${project.id}`,
            { json: payload },
        )
        setSaving(false)

        if (!result.ok) {
            const fieldErrors = issuesToRecord(result.error.issues)
            if (result.error.code === "conflict") fieldErrors.slug = result.error.message
            setErrors(fieldErrors)
            notify(result.error.message, "error")
            return
        }

        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify(isNew ? "Project created." : "Saved.")
        if (isNew) router.replace(`/admin/projects/${result.data.id}`)
        else router.refresh()
    }

    async function handleDelete () {
        if (!project) return
        if (!window.confirm(`Delete "${project.name}"? Its images will be deleted too. This can't be undone.`)) return

        setDeleting(true)
        const result = await adminFetch(`/api/admin/projects/${project.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify("Project deleted.")
        router.replace("/admin/projects")
        router.refresh()
    }

    const techById = new Map(technologies.map(tech => [tech.id, tech]))
    const availableTech = technologies.filter(tech =>
        !state.technology_ids.includes(tech.id) && tech.name.toLowerCase().includes(techQuery.trim().toLowerCase()),
    )

    return (
        <form onSubmit={event => { event.preventDefault(); void handleSave() }} noValidate className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/admin/projects" className="text-sm text-muted hover:text-white">← All projects</Link>
                    <h1 className="mt-2 break-words text-2xl font-bold md:text-3xl">{isNew ? "New project" : state.name || "Untitled project"}</h1>
                </div>
            </div>

            {errors._form && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{errors._form}</p>}

            <Card title="Basics" hint="Shown on project cards and at the top of the project page.">
                <div className="grid gap-5 md:grid-cols-2">
                    <TextField label="Name" value={state.name} onChange={event => setName(event.target.value)} error={errors.name} maxLength={LIMITS.name} required />
                    <TextField
                        label="Slug"
                        value={state.slug}
                        onChange={event => { setSlugTouched(true); set("slug", event.target.value.toLowerCase()) }}
                        error={errors.slug}
                        hint={`/projects/${state.slug || "…"}`}
                        required
                    />
                </div>
                <TextField label="Tagline" value={state.tagline} onChange={event => set("tagline", event.target.value)} error={errors.tagline} hint="Detail page heading: “Name — tagline”." maxLength={LIMITS.tagline} required />
                <TextAreaField
                    label="Summary"
                    rows={3}
                    value={state.summary}
                    onChange={event => set("summary", event.target.value)}
                    error={errors.summary}
                    hint={`Card description · ${state.summary.length}/${LIMITS.summary}`}
                    maxLength={LIMITS.summary}
                    required
                />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <TextField label="Type" value={state.project_type} onChange={event => set("project_type", event.target.value)} error={errors.project_type} hint="Badge text, e.g. Software" required />
                    <TextField label="Niche" value={state.niche} onChange={event => set("niche", event.target.value)} error={errors.niche} hint="e.g. Fintech" />
                    <TextField label="Year" type="number" inputMode="numeric" min={2000} max={2100} value={state.year} onChange={event => set("year", event.target.value)} error={errors.year} required />
                    <TextField label="Client" value={state.client} onChange={event => set("client", event.target.value)} error={errors.client} />
                    <TextField label="Role" value={state.role} onChange={event => set("role", event.target.value)} error={errors.role} hint="e.g. Founder, COO & CTO" />
                    <SelectField label="Status" value={state.status} onChange={event => set("status", event.target.value as ProjectStatus)} error={errors.status}>
                        {PROJECT_STATUSES.map(status => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}
                    </SelectField>
                </div>
                <TextField label="Website URL" type="url" placeholder="https://" value={state.website_url} onChange={event => set("website_url", event.target.value)} error={errors.website_url} hint="Shows the “Visit website” button when set." />
            </Card>

            <Card title="Cover image" hint="Used on project cards and the detail page header. PNG, JPG, WEBP, AVIF or GIF up to 5 MB.">
                <div className="grid gap-5 lg:grid-cols-2">
                    <ImageUpload
                        bucket="project-images"
                        folder={uploadFolder}
                        path={state.cover_image_path}
                        url={state.cover_image_url}
                        onChange={value => setState(current => ({ ...current, cover_image_path: value?.path ?? null, cover_image_url: value?.url ?? null }))}
                        error={errors.cover_image_path}
                    />
                    <TextField label="Alt text" value={state.cover_image_alt} onChange={event => set("cover_image_alt", event.target.value)} error={errors.cover_image_alt} hint="Describe the image for screen readers." />
                </div>
            </Card>

            <Card title="Story" hint={`Each section appears on the project page only when filled. ${PARAGRAPH_HINT}`}>
                <TextAreaField label="Overview" value={state.overview} onChange={event => set("overview", event.target.value)} error={errors.overview} rows={6} />
                <TextAreaField label="The Problem" value={state.problem} onChange={event => set("problem", event.target.value)} error={errors.problem} rows={6} />
                <TextAreaField label="The Solution" value={state.solution} onChange={event => set("solution", event.target.value)} error={errors.solution} rows={6} />
                <TextAreaField label="My Role" value={state.dev_role} onChange={event => set("dev_role", event.target.value)} error={errors.dev_role} rows={4} />
                <TextAreaField label="Monetization Model" value={state.monetization} onChange={event => set("monetization", event.target.value)} error={errors.monetization} rows={4} />
                <TextAreaField label="Project Summary" value={state.project_summary} onChange={event => set("project_summary", event.target.value)} error={errors.project_summary} rows={5} />
            </Card>

            <Card
                title="Features"
                hint="Accordion on the project page. The first feature opens by default."
                action={
                    <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={state.features.length >= LIMITS.features}
                        onClick={() => set("features", [...state.features, { key: newKey(), title: "", description: "", image_path: null, image_url: null, image_alt: "" }])}
                    >
                        <FiPlus aria-hidden="true" /> Add feature
                    </button>
                }
            >
                {errors.features && <p className="text-xs text-rose-400">{errors.features}</p>}
                {state.features.length === 0 && <p className="text-sm text-dim">No features yet.</p>}
                {state.features.map((feature, index) => (
                    <div key={feature.key} className="rounded-xl border border-white/6 bg-white/2 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-dim">Feature {index + 1}</span>
                            <ItemControls
                                label={`feature ${index + 1}`}
                                onUp={index > 0 ? () => set("features", moveItem(state.features, index, -1)) : undefined}
                                onDown={index < state.features.length - 1 ? () => set("features", moveItem(state.features, index, 1)) : undefined}
                                onRemove={() => set("features", state.features.filter(item => item.key !== feature.key))}
                            />
                        </div>
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                            <div className="flex flex-col gap-5">
                                <TextField label="Title" value={feature.title} onChange={event => updateFeature(feature.key, { title: event.target.value })} error={errors[`features.${index}.title`]} required />
                                <TextAreaField label="Description" rows={3} value={feature.description} onChange={event => updateFeature(feature.key, { description: event.target.value })} error={errors[`features.${index}.description`]} />
                                <TextField label="Image alt text" value={feature.image_alt} onChange={event => updateFeature(feature.key, { image_alt: event.target.value })} error={errors[`features.${index}.image_alt`]} />
                            </div>
                            <ImageUpload
                                bucket="project-images"
                                folder={uploadFolder}
                                path={feature.image_path}
                                url={feature.image_url}
                                onChange={value => updateFeature(feature.key, { image_path: value?.path ?? null, image_url: value?.url ?? null })}
                                label="Feature image (optional)"
                                error={errors[`features.${index}.image_path`]}
                            />
                        </div>
                    </div>
                ))}
            </Card>

            <Card title="Technologies" hint="Intro text, labelled breakdown paragraphs, and the icon grid.">
                <TextAreaField label="Intro" rows={2} value={state.tech_intro} onChange={event => set("tech_intro", event.target.value)} error={errors.tech_intro} hint="e.g. “Building a platform of this depth required…”" />

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">Breakdown</h3>
                        <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={state.tech_breakdown.length >= LIMITS.breakdown}
                            onClick={() => set("tech_breakdown", [...state.tech_breakdown, { key: newKey(), label: "", description: "" }])}
                        >
                            <FiPlus aria-hidden="true" /> Add row
                        </button>
                    </div>
                    {state.tech_breakdown.length === 0 && <p className="text-sm text-dim">No breakdown rows yet. Example: “Frontend” → “Next.js with Tailwind…”.</p>}
                    {state.tech_breakdown.map((row, index) => (
                        <div key={row.key} className="grid gap-3 rounded-xl border border-white/6 bg-white/2 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_auto] lg:items-start">
                            <TextField label="Label" value={row.label} onChange={event => updateBreakdown(row.key, { label: event.target.value })} error={errors[`tech_breakdown.${index}.label`]} />
                            <TextAreaField label="Description" rows={2} value={row.description} onChange={event => updateBreakdown(row.key, { description: event.target.value })} error={errors[`tech_breakdown.${index}.description`]} />
                            <div className="lg:pt-7">
                                <ItemControls
                                    label={`breakdown row ${index + 1}`}
                                    onUp={index > 0 ? () => set("tech_breakdown", moveItem(state.tech_breakdown, index, -1)) : undefined}
                                    onDown={index < state.tech_breakdown.length - 1 ? () => set("tech_breakdown", moveItem(state.tech_breakdown, index, 1)) : undefined}
                                    onRemove={() => set("tech_breakdown", state.tech_breakdown.filter(item => item.key !== row.key))}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">Icon grid</h3>
                        <Link href="/admin/technologies" target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-white">
                            Manage technologies <FiExternalLink aria-hidden="true" />
                        </Link>
                    </div>
                    {errors.technology_ids && <p className="text-xs text-rose-400">{errors.technology_ids}</p>}
                    <div className="flex flex-wrap gap-2">
                        {state.technology_ids.length === 0 && <p className="text-sm text-dim">No technologies selected.</p>}
                        {state.technology_ids.map((id, index) => (
                            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-accent-1/40 bg-accent-1/10 py-1 pr-1 pl-3 text-sm">
                                {techById.get(id)?.name ?? "Unknown"}
                                <button type="button" aria-label={`Move ${techById.get(id)?.name} earlier`} disabled={index === 0} onClick={() => set("technology_ids", moveItem(state.technology_ids, index, -1))} className="rounded-full p-1 text-muted hover:text-white disabled:opacity-30">
                                    <FiArrowUp className="-rotate-90" aria-hidden="true" />
                                </button>
                                <button type="button" aria-label={`Remove ${techById.get(id)?.name}`} onClick={() => set("technology_ids", state.technology_ids.filter(techId => techId !== id))} className="rounded-full p-1 text-muted hover:text-rose-400">
                                    <FiX aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="search"
                        placeholder="Search technologies to add…"
                        value={techQuery}
                        onChange={event => setTechQuery(event.target.value)}
                        aria-label="Search technologies"
                        className={inputClass}
                    />
                    <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                        {availableTech.map(tech => (
                            <button
                                key={tech.id}
                                type="button"
                                onClick={() => set("technology_ids", [...state.technology_ids, tech.id])}
                                disabled={state.technology_ids.length >= LIMITS.technologies}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-sm text-muted transition-colors hover:border-accent-1 hover:text-white"
                            >
                                <FiPlus aria-hidden="true" /> {tech.name}
                            </button>
                        ))}
                        {availableTech.length === 0 && <p className="text-sm text-dim">No matching technologies.</p>}
                    </div>
                </div>
            </Card>

            <Card title="Gallery" hint="Extra images shown on the project page (optional).">
                {errors.gallery && <p className="text-xs text-rose-400">{errors.gallery}</p>}
                <div className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
                    {state.gallery.map((image, index) => (
                        <div key={image.key} className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/2 p-3">
                            <ImageUpload
                                bucket="project-images"
                                folder={uploadFolder}
                                path={image.image_path}
                                url={image.image_url}
                                onChange={value => value
                                    ? updateGallery(image.key, { image_path: value.path, image_url: value.url })
                                    : set("gallery", state.gallery.filter(item => item.key !== image.key))}
                                aspectClass="aspect-[4/3]"
                                error={errors[`gallery.${index}.image_path`]}
                            />
                            <TextField label="Alt text" value={image.alt} onChange={event => updateGallery(image.key, { alt: event.target.value })} error={errors[`gallery.${index}.alt`]} required />
                            <ItemControls
                                label={`gallery image ${index + 1}`}
                                onUp={index > 0 ? () => set("gallery", moveItem(state.gallery, index, -1)) : undefined}
                                onDown={index < state.gallery.length - 1 ? () => set("gallery", moveItem(state.gallery, index, 1)) : undefined}
                                onRemove={() => set("gallery", state.gallery.filter(item => item.key !== image.key))}
                            />
                        </div>
                    ))}
                    {state.gallery.length < LIMITS.gallery && (
                        <div className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/2 p-3">
                            <ImageUpload
                                bucket="project-images"
                                folder={uploadFolder}
                                path={null}
                                url={null}
                                onChange={value => {
                                    if (value) set("gallery", [...state.gallery, { key: newKey(), image_path: value.path, image_url: value.url, alt: "" }])
                                }}
                                label="Add gallery image"
                                aspectClass="aspect-[4/3]"
                            />
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Visibility">
                <label className="flex items-center justify-between gap-4">
                    <span>
                        <span className="block text-sm font-semibold">Published</span>
                        <span className="block text-xs text-muted">Visible on /projects and its own page.</span>
                    </span>
                    <Switch checked={state.is_published} onChange={value => set("is_published", value)} label="Published" />
                </label>
                <label className="flex items-center justify-between gap-4">
                    <span>
                        <span className="block text-sm font-semibold">Featured</span>
                        <span className="block text-xs text-muted">Shown in the homepage “My Works” section (first 3 by order).</span>
                    </span>
                    <Switch checked={state.is_featured} onChange={value => set("is_featured", value)} label="Featured" />
                </label>
            </Card>

            <SaveBar
                isNew={isNew}
                isDirty={isDirty}
                saving={saving}
                deleting={deleting}
                createLabel="Create project"
                onDelete={handleDelete}
                viewHref={!isNew && project.is_published ? `/projects/${project.slug}` : undefined}
            />
        </form>
    )
}

function ItemControls ({ label, onUp, onDown, onRemove }: { label: string, onUp?: () => void, onDown?: () => void, onRemove: () => void }) {
    return (
        <div className="flex items-center gap-1.5">
            <button type="button" onClick={onUp} disabled={!onUp} aria-label={`Move ${label} up`} className={iconButtonClass}><FiArrowUp aria-hidden="true" /></button>
            <button type="button" onClick={onDown} disabled={!onDown} aria-label={`Move ${label} down`} className={iconButtonClass}><FiArrowDown aria-hidden="true" /></button>
            <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className={`${iconButtonClass} hover:border-rose-500 hover:text-rose-400`}><FiTrash2 aria-hidden="true" /></button>
        </div>
    )
}
