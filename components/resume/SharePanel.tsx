"use client"

import * as React from "react"
import { LuCheck, LuCopy, LuDownload, LuExternalLink, LuLink, LuLoaderCircle, LuShieldOff, LuTrash2 } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { inputClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { PanelHeading, RField, labelClass } from "@/components/resume/controls"
import { toShareJpeg } from "@/components/resume/pdf/client"
import { relativeTime, useNow } from "@/components/resume/useNow"
import { adminFetch } from "@/lib/admin/client"

type ShareItem = { id: string, label: string | null, allow_download: boolean, expires_at: string | null, revoked_at: string | null, view_count: number, last_viewed_at: string | null, created_at: string }
type Created = { url: string, qrPng: string, qrSvg: string }

type Props = {
    resumeId: string
    photoUrl: string | null
    showPhoto: boolean
    hasPhoto: boolean
    dirty: boolean
    save: () => Promise<boolean>
}

function expiryLabel (share: ShareItem, now: number) {
    if (share.revoked_at) return "Revoked"
    if (!share.expires_at) return "No expiry"
    const remaining = new Date(share.expires_at).getTime() - now
    if (now && remaining <= 0) return "Expired"
    if (!now) return `Expires ${new Date(share.expires_at).toLocaleDateString("en-GB")}`
    const days = Math.ceil(remaining / 86_400_000)
    return `Expires in ${days} day${days === 1 ? "" : "s"}`
}

function downloadData (href: string, filename: string) {
    const link = document.createElement("a")
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
}

// Private share links: a frozen snapshot behind a secret URL, with a QR code. The URL (and
// QR code) can only be shown right after creating the link, since only its hash is stored.
export default function SharePanel ({ resumeId, photoUrl, showPhoto, hasPhoto, dirty, save }: Props) {
    const { notify } = useToast()
    const { confirm } = useDialog()
    const now = useNow()
    const [shares, setShares] = React.useState<ShareItem[] | null>(null)
    const [label, setLabel] = React.useState("")
    const [expires, setExpires] = React.useState<"7" | "30" | "never">("30")
    const [allowDownload, setAllowDownload] = React.useState(true)
    const [creating, setCreating] = React.useState(false)
    const [created, setCreated] = React.useState<Created | null>(null)
    const [copied, setCopied] = React.useState(false)
    const [reload, setReload] = React.useState(0)

    React.useEffect(() => {
        let cancelled = false
        adminFetch<ShareItem[]>(`/api/admin/resumes/${resumeId}/shares`).then(result => {
            if (cancelled) return
            if (result.ok) setShares(result.data)
            else notify(result.error.message, "error")
        })
        return () => { cancelled = true }
    }, [resumeId, reload, notify])

    async function create () {
        if (dirty) {
            if (!(await confirm({ title: "Save changes first?", message: "A share link shows the resume as it's saved. Your unsaved changes will be saved now, then the link is created.", confirmLabel: "Save & create link" }))) return
            if (!(await save())) return
        }
        setCreating(true)
        const photo = showPhoto && hasPhoto ? await toShareJpeg(photoUrl) : null
        const result = await adminFetch<{ id: string, url: string }>(`/api/admin/resumes/${resumeId}/shares`, {
            json: { label, expires_in_days: expires === "never" ? null : Number(expires), allow_download: allowDownload, photo_data: photo },
        })
        if (!result.ok) {
            setCreating(false)
            notify(result.error.message, "error")
            return
        }
        // Generated in the browser: the secret URL is never sent to a QR service.
        const QRCode = (await import("qrcode")).default
        const options = { margin: 2, color: { dark: "#0b0614", light: "#ffffff" }, errorCorrectionLevel: "M" as const }
        const [qrPng, qrSvg] = await Promise.all([
            QRCode.toDataURL(result.data.url, { ...options, width: 768 }),
            QRCode.toString(result.data.url, { ...options, type: "svg" }),
        ])
        setCreated({ url: result.data.url, qrPng, qrSvg })
        setCreating(false)
        setCopied(false)
        setLabel("")
        setReload(value => value + 1)
    }

    async function copy () {
        if (!created) return
        try {
            await navigator.clipboard.writeText(created.url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            notify("Couldn't copy. Select the link and copy it manually.", "error")
        }
    }

    async function revoke (share: ShareItem) {
        if (!(await confirm({ title: `Revoke ${share.label ? `“${share.label}”` : "this link"}?`, message: "Anyone who has the link (or its QR code) will see “link unavailable”. Its view count is kept.", confirmLabel: "Revoke link", tone: "warning" }))) return
        const result = await adminFetch(`/api/admin/resumes/${resumeId}/shares/${share.id}/revoke`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        notify("Link turned off.")
        setReload(value => value + 1)
    }

    async function remove (share: ShareItem) {
        const active = expiryLabel(share, now) !== "Revoked" && expiryLabel(share, now) !== "Expired"
        if (!(await confirm({ title: `Delete ${share.label ? `“${share.label}”` : "this link"}?`, message: `${active ? "The link stops working immediately. " : ""}Its view history is removed too.`, confirmLabel: "Delete", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/resumes/${resumeId}/shares/${share.id}/delete`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        setShares(list => list?.filter(entry => entry.id !== share.id) ?? null)
        notify("Link deleted.")
    }

    const filename = "resume-share-qr"

    return (
        <div>
            <PanelHeading title="Share" subtitle="A private link anyone can open without logging in. It shows the resume as it is right now; later edits don't change it." />

            <div className="grid gap-4 rounded-xl border border-white/6 bg-white/2 p-4 md:grid-cols-3">
                <RField label="Label (for you)" value={label} onChange={setLabel} maxLength={80} placeholder="e.g. Acme recruiter" />
                <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Expires</span>
                    <select value={expires} onChange={event => setExpires(event.target.value as typeof expires)} className={`${inputClass} [&>option]:bg-card`}>
                        <option value="7">In 7 days</option>
                        <option value="30">In 30 days</option>
                        <option value="never">Never</option>
                    </select>
                </label>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5 self-end text-sm">
                    <input type="checkbox" checked={allowDownload} onChange={event => setAllowDownload(event.target.checked)} className="size-4 accent-accent-1" />
                    Allow download
                </label>
                <button type="button" onClick={create} disabled={creating} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50 md:col-span-3 md:justify-self-start">
                    {creating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuLink aria-hidden="true" />} Create link
                </button>
            </div>

            {created && (
                <div className="@container mt-5 rounded-xl border border-accent-1/40 bg-accent-1/6 p-4">
                <div className="grid gap-5 @md:grid-cols-[11rem_minmax(0,1fr)] @md:items-center">
                    <div className="flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                        <img src={created.qrPng} alt="QR code for the share link" width={176} height={176} className="size-44 rounded-xl bg-white p-1" />
                        <div className="flex gap-1.5">
                            <button type="button" onClick={() => downloadData(created.qrPng, `${filename}.png`)} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-white/6 hover:text-white"><LuDownload aria-hidden="true" /> PNG</button>
                            <button type="button" onClick={() => downloadData(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(created.qrSvg)}`, `${filename}.svg`)} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-white/6 hover:text-white"><LuDownload aria-hidden="true" /> SVG</button>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold">Your link is ready</p>
                        <p className="mt-1 text-xs text-muted">Copy it or save the QR code now. For security it can&apos;t be shown again; create a new link if you lose it.</p>
                        <input readOnly value={created.url} onFocus={event => event.target.select()} aria-label="Share link" className={`${inputClass} mt-3 min-w-0 truncate font-mono text-xs`} />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" onClick={copy} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-65/srgb from-accent-1 to-accent-2 px-4 text-sm font-bold text-white">
                                {copied ? <LuCheck className="text-emerald-300" aria-hidden="true" /> : <LuCopy aria-hidden="true" />} {copied ? "Copied" : "Copy"}
                            </button>
                            <a href={created.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/4 px-4 text-sm font-semibold hover:border-accent-1">
                                <LuExternalLink aria-hidden="true" /> Open
                            </a>
                        </div>
                    </div>
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
                        const status = expiryLabel(share, now)
                        const inactive = status === "Revoked" || status === "Expired"
                        return (
                            <li key={share.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/6 bg-white/2 p-3">
                                <div className={`min-w-0 flex-1 ${inactive ? "opacity-60" : ""}`}>
                                    <p className="truncate text-sm font-semibold">{share.label || "Untitled link"}</p>
                                    <p className="text-xs text-muted">
                                        {status} · {share.view_count} view{share.view_count === 1 ? "" : "s"}
                                        {share.last_viewed_at ? ` · last opened ${relativeTime(share.last_viewed_at, now)}` : ""}
                                        {share.allow_download ? "" : " · download off"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!inactive && (
                                        <button type="button" onClick={() => revoke(share)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/10">
                                            <LuShieldOff aria-hidden="true" /> Revoke
                                        </button>
                                    )}
                                    <button type="button" onClick={() => remove(share)} aria-label={`Delete ${share.label || "link"}`} title="Delete" className="inline-flex size-9 items-center justify-center rounded-lg text-dim hover:bg-rose-500/10 hover:text-rose-300">
                                        <LuTrash2 aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
