"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi"
import { useDialog } from "@/components/admin/Dialog"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import type { AdminTechnology } from "@/lib/admin/queries"
import { technologyInputSchema } from "@/lib/admin/schemas"
import { slugify } from "@/lib/projects/shared"
import ImageUpload from "@/components/admin/ImageUpload"
import { Card, TextField, iconButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"

type Draft = { id: string | null, name: string, slug: string, slugTouched: boolean, iconPath: string | null, iconUrl: string | null }

const emptyDraft: Draft = { id: null, name: "", slug: "", slugTouched: false, iconPath: null, iconUrl: null }

export default function TechnologiesManager ({ technologies }: { technologies: AdminTechnology[] }) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const [draft, setDraft] = React.useState<Draft | null>(null)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)

    function edit (tech: AdminTechnology) {
        setErrors({})
        setDraft({ id: tech.id, name: tech.name, slug: tech.slug, slugTouched: true, iconPath: tech.iconPath, iconUrl: tech.iconUrl })
    }

    async function save () {
        if (!draft) return
        const parsed = technologyInputSchema.safeParse({ name: draft.name, slug: draft.slug, icon_path: draft.iconPath })
        if (!parsed.success) {
            setErrors(issuesToRecord(parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))))
            return
        }

        setSaving(true)
        const result = await adminFetch(draft.id ? `/api/admin/technologies/${draft.id}` : "/api/admin/technologies", { json: parsed.data })
        setSaving(false)

        if (!result.ok) {
            const fieldErrors = issuesToRecord(result.error.issues)
            if (result.error.code === "conflict") fieldErrors[result.error.message.startsWith("Slug") ? "slug" : "name"] = result.error.message
            setErrors(fieldErrors)
            notify(result.error.message, "error")
            return
        }

        notify(draft.id ? "Technology updated." : "Technology added.")
        setDraft(null)
        setErrors({})
        router.refresh()
    }

    async function remove (tech: AdminTechnology) {
        if (!(await confirm({ title: `Delete “${tech.name}”?`, message: "It's removed from every project that uses it.", confirmLabel: "Delete", tone: "danger" }))) return
        setDeletingId(tech.id)
        const result = await adminFetch(`/api/admin/technologies/${tech.id}/delete`, { method: "POST" })
        setDeletingId(null)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        notify("Technology deleted.")
        router.refresh()
    }

    return (
        <div className="flex flex-col gap-6">
            {draft ? (
                <Card title={draft.id ? `Edit ${draft.name || "technology"}` : "Add technology"} hint="Icon: SVG, PNG or WEBP up to 10 MB. SVGs with scripts are rejected.">
                    <form
                        onSubmit={event => { event.preventDefault(); void save() }}
                        noValidate
                        className="grid gap-5 min-[560px]:grid-cols-[160px_minmax(0,1fr)]"
                    >
                        <div className="w-full max-w-40">
                        <ImageUpload
                            bucket="tech-icons"
                            folder="technologies"
                            path={draft.iconPath}
                            url={draft.iconUrl}
                            onChange={value => setDraft({ ...draft, iconPath: value?.path ?? null, iconUrl: value?.url ?? null })}
                            label="Upload icon"
                            aspectClass="aspect-square"
                            error={errors.icon_path}
                        />
                        </div>
                        <div className="flex min-w-0 flex-col gap-5">
                            <TextField
                                label="Name"
                                value={draft.name}
                                onChange={event => setDraft({ ...draft, name: event.target.value, slug: draft.slugTouched ? draft.slug : slugify(event.target.value) })}
                                error={errors.name}
                                required
                            />
                            <TextField
                                label="Slug"
                                value={draft.slug}
                                onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase(), slugTouched: true })}
                                error={errors.slug}
                                required
                            />
                            <div className="flex flex-wrap gap-3">
                                <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? "Saving…" : draft.id ? "Save changes" : "Add technology"}</button>
                                <button type="button" onClick={() => { setDraft(null); setErrors({}) }} className={secondaryButtonClass}>Cancel</button>
                            </div>
                        </div>
                    </form>
                </Card>
            ) : (
                <button type="button" onClick={() => { setErrors({}); setDraft(emptyDraft) }} className={`${primaryButtonClass} self-start`}>
                    <FiPlus aria-hidden="true" /> Add technology
                </button>
            )}

            <ul className="grid gap-3 min-[560px]:grid-cols-2 lg:grid-cols-3">
                {technologies.map(tech => (
                    <li key={tech.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/6 bg-card p-3 md:gap-4 md:p-4">
                        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/6">
                            {tech.iconUrl ? (
                                <Image src={tech.iconUrl} alt="" width={32} height={32} unoptimized className="size-8 object-contain" />
                            ) : (
                                <span className="text-sm font-bold text-muted">{tech.name.slice(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{tech.name}</p>
                            <p className="truncate text-xs text-dim">{tech.slug} · used by {tech.usageCount}</p>
                        </div>
                        <div className="flex gap-1.5">
                            <button type="button" onClick={() => edit(tech)} aria-label={`Edit ${tech.name}`} className={iconButtonClass}>
                                <FiEdit2 aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(tech)}
                                disabled={tech.usageCount > 0 || deletingId === tech.id}
                                aria-label={`Delete ${tech.name}`}
                                title={tech.usageCount > 0 ? `In use by ${tech.usageCount} project(s)` : undefined}
                                className={`${iconButtonClass} hover:border-rose-500 hover:text-rose-400`}
                            >
                                <FiTrash2 aria-hidden="true" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            {technologies.length === 0 && <p className="text-sm text-muted">No technologies yet.</p>}
        </div>
    )
}
