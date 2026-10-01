"use client"

import * as React from "react"
import { LuLoaderCircle, LuX } from "react-icons/lu"
import ChipsInput from "@/components/admin/ChipsInput"
import { SelectField, Switch, TextAreaField, TextField, primaryButtonClass, secondaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import FileTypeIcon from "@/components/documents/FileTypeIcon"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { DOCUMENT_GROUPS, DOCUMENT_GROUP_INFO, documentDetailsSchema, formatBytes, type DocumentGroup, type DocumentRecord } from "@/lib/documents/schema"

type Props = {
    document: DocumentRecord
    onClose: () => void
    onSaved: (document: DocumentRecord) => void
}

export default function DocumentEditor ({ document: doc, onClose, onSaved }: Props) {
    const { notify } = useToast()
    const ref = React.useRef<HTMLDialogElement>(null)
    const titleId = React.useId()
    const [state, setState] = React.useState({
        title: doc.title,
        description: doc.description ?? "",
        category: doc.category,
        tags: doc.tags,
        issued_on: doc.issued_on ?? "",
        expires_on: doc.expires_on ?? "",
        is_favorite: doc.is_favorite,
    })
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) => {
        setState(current => ({ ...current, [key]: value }))
        setErrors(current => ({ ...current, [key]: "" }))
    }

    React.useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        const opener = window.document.activeElement as HTMLElement | null
        dialog.showModal()
        dialog.querySelector<HTMLInputElement>("input")?.focus()
        return () => opener?.focus?.()
    }, [])

    async function save (event: React.FormEvent) {
        event.preventDefault()
        const parsed = documentDetailsSchema.safeParse(state)
        if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0] ?? "_form"), issue.message])))
            return
        }
        setSaving(true)
        const result = await adminFetch<DocumentRecord>(`/api/admin/documents/${doc.id}`, { json: parsed.data })
        setSaving(false)
        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            return notify(result.error.message, "error")
        }
        notify("Details saved.")
        onSaved({ ...result.data, thumb_url: doc.thumb_url })
        onClose()
    }

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); onClose() }}
            onKeyDown={event => { if (event.key === "Escape") event.stopPropagation() }}
            className="m-0 h-dvh max-h-none w-full max-w-none animate-fade-in border-white/10 bg-card p-0 text-fg backdrop:bg-black/65 backdrop:backdrop-blur-sm md:m-auto md:h-auto md:max-h-[90dvh] md:w-[min(40rem,calc(100vw-2rem))] md:rounded-2xl md:border md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        >
            <form onSubmit={save} className="flex h-full flex-col md:max-h-[90dvh]">
                <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                    <FileTypeIcon format={doc.format} size="sm" />
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="truncate text-base font-bold">Edit details</h2>
                        <p className="truncate text-xs text-dim">{doc.file_name} · {formatBytes(doc.size_bytes)}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-white/8 hover:text-white">
                        <LuX aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        <TextField label="Title" value={state.title} onChange={event => set("title", event.target.value)} maxLength={150} error={errors.title} className="md:col-span-2" />
                        <SelectField
                            label="Group"
                            value={state.category}
                            onChange={event => set("category", event.target.value as DocumentGroup)}
                            hint={DOCUMENT_GROUP_INFO[state.category].hint}
                            error={errors.category}
                            className="md:col-span-2"
                        >
                            {DOCUMENT_GROUPS.map(group => <option key={group} value={group}>{DOCUMENT_GROUP_INFO[group].label}</option>)}
                        </SelectField>
                        <div className="md:col-span-2">
                            <ChipsInput
                                label="Tags"
                                values={state.tags}
                                onChange={values => set("tags", values.map(value => value.toLowerCase().slice(0, 30)))}
                                max={10}
                                hint="Up to 10, e.g. aws, transcript, 2025"
                                error={errors.tags}
                            />
                        </div>
                        <TextAreaField label="Description" value={state.description} onChange={event => set("description", event.target.value)} maxLength={2000} rows={3} error={errors.description} className="md:col-span-2" />
                        <TextField label="Issued on" type="date" value={state.issued_on} onChange={event => set("issued_on", event.target.value)} error={errors.issued_on} />
                        <TextField label="Expires on" type="date" value={state.expires_on} onChange={event => set("expires_on", event.target.value)} error={errors.expires_on} hint="Optional. Shows a badge 60 days before." />
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 md:col-span-2">
                            <span className="text-sm font-medium">Favourite</span>
                            <Switch checked={state.is_favorite} onChange={value => set("is_favorite", value)} label="Favourite" />
                        </div>
                    </div>
                    {errors._form && <p className="mt-4 text-sm text-rose-300">{errors._form}</p>}
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-white/8 px-5 py-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
                    <button type="submit" disabled={saving} className={primaryButtonClass}>
                        {saving && <LuLoaderCircle className="animate-spin" aria-hidden="true" />} Save details
                    </button>
                </footer>
            </form>
        </dialog>
    )
}
