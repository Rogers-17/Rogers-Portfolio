"use client"

import * as React from "react"
import { LuCheck, LuCopy, LuLink, LuLoaderCircle, LuShieldOff, LuTrash2, LuX } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { SelectField, TextField, inputClass, primaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import FileTypeIcon from "@/components/documents/FileTypeIcon"
import { relativeTime, useNow } from "@/components/resume/useNow"
import { adminFetch } from "@/lib/admin/client"
import { SHARE_EXPIRY_OPTIONS, formatBytes, shareIsActive, type DocumentRecord, type DocumentShare } from "@/lib/documents/schema"

type Props = {
    document: DocumentRecord
    onClose: () => void
    onLinksChanged: (documentId: string, activeLinks: number) => void
}

const NO_EXPIRY = "never"
const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`

// `now` is rounded down to the minute, so these round to the nearest unit: a new 1-hour link
// reads "1 hour", not "2 hours".
function statusLabel (share: DocumentShare, now: number) {
    if (!shareIsActive(share, now)) return "Expired"
    if (!share.expires_at) return "No expiry"
    const remaining = new Date(share.expires_at).getTime() - now
    const minutes = Math.max(1, Math.round(remaining / 60_000))
    if (minutes < 60) return `Expires in ${minutes} min`
    const hours = Math.round(remaining / 3_600_000)
    if (hours < 24) return `Expires in ${plural(hours, "hour")}`
    return `Expires in ${plural(Math.round(remaining / 86_400_000), "day")}`
}

// Share links for one document: pick a time limit (none by default), copy the link once, and
// expire it whenever you like.
export default function DocumentShareDialog ({ document: doc, onClose, onLinksChanged }: Props) {
    const { notify } = useToast()
    const { confirm } = useDialog()
    const now = useNow()
    const ref = React.useRef<HTMLDialogElement>(null)
    const titleId = React.useId()
    const [shares, setShares] = React.useState<DocumentShare[] | null>(null)
    const [reload, setReload] = React.useState(0)
    const [label, setLabel] = React.useState("")
    const [expiry, setExpiry] = React.useState(NO_EXPIRY)
    const [creating, setCreating] = React.useState(false)
    const [created, setCreated] = React.useState<string | null>(null)
    const [copied, setCopied] = React.useState(false)

    React.useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        const opener = window.document.activeElement as HTMLElement | null
        dialog.showModal()
        dialog.querySelector<HTMLInputElement>("input")?.focus()
        return () => opener?.focus?.()
    }, [])

    React.useEffect(() => {
        let cancelled = false
        adminFetch<DocumentShare[]>(`/api/admin/documents/${doc.id}/shares`).then(result => {
            if (cancelled) return
            if (result.ok) setShares(result.data)
            else notify(result.error.message, "error")
        })
        return () => { cancelled = true }
    }, [doc.id, reload, notify])

    const activeLinks = shares ? shares.filter(share => shareIsActive(share, now)).length : null
    React.useEffect(() => {
        if (activeLinks !== null) onLinksChanged(doc.id, activeLinks)
    }, [doc.id, activeLinks, onLinksChanged])

    async function copyLink (url: string) {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            return true
        } catch {
            return false
        }
    }

    async function create (event: React.FormEvent) {
        event.preventDefault()
        setCreating(true)
        const result = await adminFetch<{ id: string, url: string }>(`/api/admin/documents/${doc.id}/shares`, {
            json: { label, expires_in: expiry === NO_EXPIRY ? null : Number(expiry) },
        })
        setCreating(false)
        if (!result.ok) return notify(result.error.message, "error")
        setCreated(result.data.url)
        setCopied(false)
        setLabel("")
        setReload(value => value + 1)
        // Clipboard can be blocked after an await; the Copy button is there for that.
        if (await copyLink(result.data.url)) notify("Link created and copied.")
    }

    async function manualCopy () {
        if (created && !(await copyLink(created))) notify("Couldn't copy. Select the link and copy it manually.", "error")
    }

    async function expire (share: DocumentShare) {
        if (!(await confirm({ title: `Expire ${share.label ? `“${share.label}”` : "this link"}?`, message: "It stops working for everyone within a minute, including anywhere you've already posted it. It can't be turned back on.", confirmLabel: "Expire link", tone: "warning" }))) return
        const result = await adminFetch(`/api/admin/documents/${doc.id}/shares/${share.id}/revoke`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        notify("Link expired.")
        setReload(value => value + 1)
    }

    async function remove (share: DocumentShare) {
        const active = shareIsActive(share, now)
        if (!(await confirm({ title: `Delete ${share.label ? `“${share.label}”` : "this link"}?`, message: `${active ? "The link stops working within a minute. " : ""}Its open count is removed too.`, confirmLabel: "Delete", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/documents/${doc.id}/shares/${share.id}/delete`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        setShares(list => list?.filter(entry => entry.id !== share.id) ?? null)
        notify("Link deleted.")
    }

    const selected = SHARE_EXPIRY_OPTIONS.find(option => String(option.seconds ?? NO_EXPIRY) === expiry)
    const hint = selected?.seconds ? `Stops working automatically after ${selected.label}. You can still expire it sooner.` : "Works until you expire it."

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); onClose() }}
            onKeyDown={event => { if (event.key === "Escape") event.stopPropagation() }}
            className="m-0 h-dvh max-h-none w-full max-w-none animate-fade-in border-white/10 bg-card p-0 text-fg backdrop:bg-black/65 backdrop:backdrop-blur-sm md:m-auto md:h-auto md:max-h-[90dvh] md:w-[min(40rem,calc(100vw-2rem))] md:rounded-2xl md:border md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        >
            <div className="flex h-full flex-col md:max-h-[90dvh]">
                <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                    <FileTypeIcon format={doc.format} size="sm" />
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="truncate text-base font-bold">Share link</h2>
                        <p className="truncate text-xs text-dim">{doc.file_name} · {formatBytes(doc.size_bytes)}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-white/8 hover:text-white">
                        <LuX aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <form onSubmit={create} className="grid gap-5 md:grid-cols-2">
                        <TextField label="Label (for you)" value={label} onChange={event => setLabel(event.target.value)} maxLength={80} placeholder="e.g. CV" />
                        <SelectField label="Link expires" value={expiry} onChange={event => setExpiry(event.target.value)} hint={hint}>
                            {SHARE_EXPIRY_OPTIONS.map(option => (
                                <option key={option.label} value={String(option.seconds ?? NO_EXPIRY)}>{option.seconds ? `After ${option.label}` : option.label}</option>
                            ))}
                        </SelectField>
                        <button type="submit" disabled={creating} className={`${primaryButtonClass} min-h-11 md:col-span-2 md:justify-self-start`}>
                            {creating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuLink aria-hidden="true" />} Create link
                        </button>
                    </form>

                    {created && (
                        <div className="mt-5 rounded-xl border border-accent-1/40 bg-accent-1/6 p-4">
                            <p className="text-sm font-semibold">Your link is ready</p>
                            <p className="mt-1 text-xs text-muted">Copy it now. It can&apos;t be shown again; create a new link if you lose it.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <input readOnly value={created} onFocus={event => event.target.select()} aria-label="Share link" className={`${inputClass} min-w-0 flex-1 basis-56 truncate font-mono text-xs`} />
                                <button type="button" onClick={manualCopy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/4 px-5 text-sm font-semibold transition-colors hover:border-accent-1 sm:flex-none">
                                    {copied ? <LuCheck className="text-emerald-300" aria-hidden="true" /> : <LuCopy aria-hidden="true" />} {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                        </div>
                    )}

                    <h3 className="mt-8 text-sm font-bold">Links</h3>
                    {shares === null ? (
                        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><LuLoaderCircle className="animate-spin" aria-hidden="true" /> Loading…</p>
                    ) : shares.length === 0 ? (
                        <p className="mt-3 text-sm text-muted">No links yet.</p>
                    ) : (
                        <ul className="mt-3 flex flex-col gap-2">
                            {shares.map(share => {
                                const active = shareIsActive(share, now)
                                return (
                                    <li key={share.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/6 bg-white/2 p-3">
                                        <div className={`min-w-0 flex-1 basis-40 ${active ? "" : "opacity-60"}`}>
                                            <p className="truncate text-sm font-semibold">{share.label || "Untitled link"}</p>
                                            <p className="text-xs text-muted">
                                                {statusLabel(share, now)} · {plural(share.open_count, "view")} · {plural(share.download_count, "download")}
                                                {share.last_opened_at ? ` · last opened ${relativeTime(share.last_opened_at, now)}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {active && (
                                                <button type="button" onClick={() => expire(share)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/10 md:min-h-9">
                                                    <LuShieldOff aria-hidden="true" /> Expire now
                                                </button>
                                            )}
                                            <button type="button" onClick={() => remove(share)} aria-label={`Delete ${share.label || "link"}`} title="Delete" className="inline-flex size-11 items-center justify-center rounded-lg text-dim hover:bg-rose-500/10 hover:text-rose-300 md:size-9">
                                                <LuTrash2 aria-hidden="true" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </dialog>
    )
}
