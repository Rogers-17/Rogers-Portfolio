"use client"

import * as React from "react"
import { LuBookmarkPlus, LuEye, LuHistory, LuLoaderCircle, LuPencil, LuRotateCcw, LuTrash2, LuX } from "react-icons/lu"
import { useToast } from "@/components/admin/Toast"
import { PanelHeading, ghostButton } from "@/components/resume/controls"
import { PdfViewer } from "@/components/resume/PdfPreview"
import { toPdfImage } from "@/components/resume/pdf/client"
import { relativeTime, useNow } from "@/components/resume/useNow"
import { adminFetch } from "@/lib/admin/client"
import { TEMPLATE_INFO, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

type VersionItem = { id: string, name: string | null, title: string, template: TemplateKey, created_at: string, sections: number }
export type VersionSnapshot = { id: string, name: string | null, created_at: string, title: string, template: TemplateKey, design: ResumeDesign, data: ResumeData }
type EditorSnapshot = { title: string, template: TemplateKey, design: ResumeDesign, data: ResumeData }

type Props = {
    resumeId: string
    photoUrl: string | null
    current: () => EditorSnapshot
    onRestore: (version: VersionSnapshot) => void
    // Bumps after each save so the list refreshes.
    refreshKey: number
}

const iconButton = "inline-flex size-9 items-center justify-center rounded-lg text-dim transition-colors hover:bg-white/6 hover:text-white disabled:opacity-30"

export default function HistoryPanel ({ resumeId, photoUrl, current, onRestore, refreshKey }: Props) {
    const { notify } = useToast()
    const now = useNow()
    const [versions, setVersions] = React.useState<VersionItem[] | null>(null)
    const [busy, setBusy] = React.useState<string | null>(null)
    const [preview, setPreview] = React.useState<VersionSnapshot | null>(null)
    const [reload, setReload] = React.useState(0)

    React.useEffect(() => {
        let cancelled = false
        adminFetch<VersionItem[]>(`/api/admin/resumes/${resumeId}/versions`).then(result => {
            if (cancelled) return
            if (result.ok) setVersions(result.data)
            else notify(result.error.message, "error")
        })
        return () => { cancelled = true }
    }, [resumeId, refreshKey, reload, notify])

    const refresh = () => setReload(value => value + 1)

    async function saveNamed () {
        const name = window.prompt("Name this version (e.g. “Sent to Acme”):")?.trim()
        if (!name) return
        setBusy("new")
        const result = await adminFetch(`/api/admin/resumes/${resumeId}/versions`, { json: { name: name.slice(0, 80), state: current() } })
        setBusy(null)
        if (!result.ok) return notify(result.error.message, "error")
        notify("Version saved.")
        refresh()
    }

    async function load (id: string) {
        const result = await adminFetch<VersionSnapshot>(`/api/admin/resumes/${resumeId}/versions/${id}`)
        if (!result.ok) {
            notify(result.error.message, "error")
            return null
        }
        return result.data
    }

    async function restore (item: VersionItem) {
        if (!window.confirm(`Restore “${item.name ?? "Auto-save"}” from ${relativeTime(item.created_at, now)}? Your current version is kept in history first.`)) return
        setBusy(item.id)
        // Keep the current editor state so the restore can be undone.
        const backup = await adminFetch(`/api/admin/resumes/${resumeId}/versions`, { json: { name: `Before restoring (${new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })})`.slice(0, 80), state: current() } })
        const version = backup.ok ? await load(item.id) : null
        setBusy(null)
        if (!backup.ok) return notify(backup.error.message, "error")
        if (!version) return
        onRestore(version)
        notify("Version restored as unsaved changes. Click Save to keep it.")
        refresh()
    }

    async function rename (item: VersionItem) {
        const name = window.prompt("Version name:", item.name ?? "")?.trim()
        if (!name || name === item.name) return
        const result = await adminFetch(`/api/admin/resumes/${resumeId}/versions/${item.id}`, { json: { name: name.slice(0, 80) } })
        if (!result.ok) return notify(result.error.message, "error")
        refresh()
    }

    async function remove (item: VersionItem) {
        if (!window.confirm("Delete this version?")) return
        const result = await adminFetch(`/api/admin/resumes/${resumeId}/versions/${item.id}/delete`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        setVersions(list => list?.filter(entry => entry.id !== item.id) ?? null)
    }

    return (
        <div>
            <PanelHeading
                title="Version history"
                subtitle="Every save keeps a snapshot (at most one per 10 minutes). Named versions are kept forever."
                action={<button type="button" onClick={saveNamed} disabled={busy === "new"} className={ghostButton}>{busy === "new" ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuBookmarkPlus aria-hidden="true" />} Save named version</button>}
            />

            {versions === null ? (
                <p className="flex items-center gap-2 text-sm text-muted"><LuLoaderCircle className="animate-spin" aria-hidden="true" /> Loading history…</p>
            ) : versions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/12 p-8 text-center">
                    <LuHistory className="mx-auto text-2xl text-dim" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold">No versions yet</p>
                    <p className="mt-1 text-xs text-muted">Save the resume to create the first snapshot.</p>
                </div>
            ) : (
                <ol className="relative flex flex-col gap-1 border-l border-white/10 pl-5">
                    {versions.map(item => (
                        <li key={item.id} className="group relative rounded-xl px-3 py-2.5 transition-colors hover:bg-white/3">
                            <span className={`absolute top-4 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-card ${item.name ? "bg-linear-65/srgb from-accent-1 to-accent-2" : "bg-white/25"}`} aria-hidden="true" />
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{item.name ?? "Auto-save"}</p>
                                    <p className="text-xs text-muted">
                                        <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString("en-GB")}>{relativeTime(item.created_at, now)}</time>
                                        {` · ${item.sections} sections · ${TEMPLATE_INFO[item.template].label}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button type="button" onClick={async () => setPreview(await load(item.id))} aria-label="Preview this version" title="Preview" className={iconButton}><LuEye aria-hidden="true" /></button>
                                    <button type="button" onClick={() => restore(item)} disabled={busy !== null} aria-label="Restore this version" title="Restore" className={iconButton}>{busy === item.id ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuRotateCcw aria-hidden="true" />}</button>
                                    <button type="button" onClick={() => rename(item)} aria-label={item.name ? "Rename" : "Name this version"} title={item.name ? "Rename" : "Name it (keeps it forever)"} className={iconButton}><LuPencil aria-hidden="true" /></button>
                                    <button type="button" onClick={() => remove(item)} aria-label="Delete this version" title="Delete" className={`${iconButton} hover:bg-rose-500/10 hover:text-rose-300`}><LuTrash2 aria-hidden="true" /></button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {preview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-surface/95 p-3 backdrop-blur md:p-6" role="dialog" aria-modal="true" aria-label="Version preview">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">{preview.name ?? "Auto-save"}</p>
                            <p className="text-xs text-muted">{new Date(preview.created_at).toLocaleString("en-GB")}</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { const item = versions?.find(entry => entry.id === preview.id); setPreview(null); if (item) void restore(item) }} className={ghostButton}><LuRotateCcw aria-hidden="true" /> Restore</button>
                            <button type="button" onClick={() => setPreview(null)} className={ghostButton} autoFocus><LuX aria-hidden="true" /> Close</button>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1">
                        <PdfViewer
                            documentKey={preview.id}
                            filename={`${preview.title} (${preview.name ?? "version"})`}
                            className="h-full"
                            build={async () => {
                                const [{ default: ResumeDocument }, photo] = await Promise.all([
                                    import("@/components/resume/pdf/ResumeDocument"),
                                    preview.design.showPhoto && preview.data.contact.photoPath ? toPdfImage(photoUrl) : Promise.resolve(null),
                                ])
                                return <ResumeDocument template={preview.template} design={preview.design} data={preview.data} photoUrl={photo} title={preview.title} />
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
