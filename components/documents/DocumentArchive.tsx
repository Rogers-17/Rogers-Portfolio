"use client"

import * as React from "react"
import { LuGrid2X2, LuList, LuSearch, LuUpload, LuCloudUpload, LuX } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { inputClass, primaryButtonClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import DocumentEditor from "@/components/documents/DocumentEditor"
import DocumentList, { type DocumentAction } from "@/components/documents/DocumentList"
import DocumentPreview from "@/components/documents/DocumentPreview"
import { UploadQueue, useDocumentUploads } from "@/components/documents/DocumentUploader"
import { adminFetch } from "@/lib/admin/client"
import {
    DOCUMENT_ACCEPT,
    DOCUMENT_GROUPS,
    DOCUMENT_GROUP_INFO,
    DOCUMENT_SORTS,
    expiryState,
    filterDocuments,
    formatBytes,
    type DocumentFilter,
    type DocumentRecord,
    type DocumentSort,
} from "@/lib/documents/schema"

type Props = {
    initialDocuments: DocumentRecord[]
    initialFilter: DocumentFilter
    today: string
}

const SORT_LABELS: Record<DocumentSort, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    name: "Name (A–Z)",
    size: "Largest first",
    expiry: "Expiring first",
}

const VIEW_KEY = "rogers.documents.view"

function filterToQuery (filter: DocumentFilter) {
    const params = new URLSearchParams()
    if (filter.q.trim()) params.set("q", filter.q.trim())
    if (filter.group) params.set("group", filter.group)
    if (filter.favorites) params.set("favorites", "1")
    if (filter.expiring) params.set("expiring", "1")
    if (filter.sort !== "newest") params.set("sort", filter.sort)
    const query = params.toString()
    return query ? `?${query}` : window.location.pathname
}

export default function DocumentArchive ({ initialDocuments, initialFilter, today }: Props) {
    const { notify } = useToast()
    const { confirm, prompt } = useDialog()
    const [documents, setDocuments] = React.useState(initialDocuments)
    const [filter, setFilter] = React.useState(initialFilter)
    const [view, setView] = React.useState<"list" | "grid">("list")
    const [editing, setEditing] = React.useState<DocumentRecord | null>(null)
    const [previewing, setPreviewing] = React.useState<DocumentRecord | null>(null)
    const [dragging, setDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const onUploaded = React.useCallback((document: DocumentRecord) => {
        setDocuments(current => [document, ...current.filter(entry => entry.id !== document.id)])
    }, [])
    const uploads = useDocumentUploads(onUploaded)
    const uploadGroup = filter.group ?? "other"

    // Remembered view (per browser; storage can be unavailable).
    React.useEffect(() => {
        try {
            const saved = window.localStorage.getItem(VIEW_KEY)
            // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
            if (saved === "grid" || saved === "list") setView(saved)
        } catch { /* ignore */ }
    }, [])
    function changeView (next: "list" | "grid") {
        setView(next)
        try { window.localStorage.setItem(VIEW_KEY, next) } catch { /* ignore */ }
    }

    // Keep the filters in the URL (search is debounced) so a reload keeps them.
    React.useEffect(() => {
        const timer = setTimeout(() => window.history.replaceState(null, "", filterToQuery(filter)), 250)
        return () => clearTimeout(timer)
    }, [filter])

    const setFilterValue = <K extends keyof DocumentFilter>(key: K, value: DocumentFilter[K]) => setFilter(current => ({ ...current, [key]: value }))

    // Drop files anywhere on the page.
    const addFiles = React.useCallback((files: FileList | File[] | null) => {
        const list = files ? [...files] : []
        if (list.length) uploads.add(list, uploadGroup)
    }, [uploads, uploadGroup])

    React.useEffect(() => {
        let depth = 0
        const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false
        const onEnter = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth += 1
            setDragging(true)
        }
        const onOver = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault() }
        const onLeave = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth = Math.max(0, depth - 1)
            if (!depth) setDragging(false)
        }
        const onDrop = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            depth = 0
            setDragging(false)
            addFiles(event.dataTransfer?.files ?? null)
        }
        window.addEventListener("dragenter", onEnter)
        window.addEventListener("dragover", onOver)
        window.addEventListener("dragleave", onLeave)
        window.addEventListener("drop", onDrop)
        return () => {
            window.removeEventListener("dragenter", onEnter)
            window.removeEventListener("dragover", onOver)
            window.removeEventListener("dragleave", onLeave)
            window.removeEventListener("drop", onDrop)
        }
    }, [addFiles])

    const visible = React.useMemo(() => filterDocuments([...documents], filter, today), [documents, filter, today])
    const counts = React.useMemo(() => {
        const map = new Map<string, number>()
        for (const document of documents) map.set(document.category, (map.get(document.category) ?? 0) + 1)
        return map
    }, [documents])
    const favorites = documents.filter(document => document.is_favorite).length
    const expiring = documents.filter(document => expiryState(document.expires_on, today)).length
    const totalBytes = documents.reduce((sum, document) => sum + document.size_bytes, 0)
    const filtered = Boolean(filter.q.trim() || filter.group || filter.favorites || filter.expiring)

    const replace = (document: DocumentRecord) => setDocuments(current => current.map(entry => (entry.id === document.id ? document : entry)))

    async function signedLink (document: DocumentRecord, purpose: "download" | "share", expiresIn?: 3600 | 86400) {
        const result = await adminFetch<{ url: string, expiresAt: string }>(`/api/admin/documents/${document.id}/link`, { json: { purpose, expiresIn } })
        if (!result.ok) {
            notify(result.error.message, "error")
            return null
        }
        return result.data
    }

    async function download (document: DocumentRecord) {
        const link = await signedLink(document, "download")
        if (!link) return
        const anchor = window.document.createElement("a")
        anchor.href = link.url
        anchor.rel = "noopener"
        window.document.body.append(anchor)
        anchor.click()
        anchor.remove()
    }

    async function share (document: DocumentRecord, expiresIn: 3600 | 86400) {
        const link = await signedLink(document, "share", expiresIn)
        if (!link) return
        const until = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(link.expiresAt))
        try {
            await navigator.clipboard.writeText(link.url)
            notify(`Link copied. It works until ${until} and can't be revoked before then.`)
        } catch {
            // Clipboard can be blocked after an await; show the link to copy by hand.
            await prompt({ title: "Copy this link", message: `It works until ${until} and can't be revoked before then.`, label: "Temporary link", defaultValue: link.url, confirmLabel: "Done", required: false })
        }
    }

    async function toggleFavorite (document: DocumentRecord) {
        const next = { ...document, is_favorite: !document.is_favorite }
        replace(next)
        const result = await adminFetch(`/api/admin/documents/${document.id}`, {
            json: {
                title: document.title,
                description: document.description,
                category: document.category,
                tags: document.tags,
                issued_on: document.issued_on,
                expires_on: document.expires_on,
                is_favorite: next.is_favorite,
            },
        })
        if (!result.ok) {
            replace(document)
            notify(result.error.message, "error")
        }
    }

    async function remove (document: DocumentRecord) {
        const confirmed = await confirm({
            title: `Delete “${document.title}”?`,
            message: "The file is removed permanently. Links you've already shared stop working.",
            confirmLabel: "Delete document",
            tone: "danger",
        })
        if (!confirmed) return
        const result = await adminFetch(`/api/admin/documents/${document.id}/delete`, { method: "POST" })
        if (!result.ok) return notify(result.error.message, "error")
        setDocuments(current => current.filter(entry => entry.id !== document.id))
        notify("Document deleted.")
    }

    function onAction (document: DocumentRecord, action: DocumentAction) {
        switch (action) {
            case "preview": return setPreviewing(document)
            case "download": return void download(document)
            case "share-1h": return void share(document, 3600)
            case "share-24h": return void share(document, 86400)
            case "edit": return setEditing(document)
            case "favorite": return void toggleFavorite(document)
            case "delete": return void remove(document)
        }
    }

    const chip = (active: boolean) =>
        `inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${active ? "border-accent-1/60 bg-accent-1/12 text-white" : "border-white/10 text-muted hover:border-white/25 hover:text-white"}`
    const count = (value: number) => <span className="text-xs font-medium text-dim">{value}</span>

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wider text-accent-1 uppercase">Archive</p>
                    <h1 className="mt-1 text-2xl font-bold md:text-3xl">Documents</h1>
                    <p className="mt-1 text-sm text-muted">
                        {documents.length === 1 ? "1 file" : `${documents.length} files`} · {formatBytes(totalBytes)} · private to you
                    </p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`${primaryButtonClass} max-sm:w-full`}>
                    <LuUpload aria-hidden="true" /> Upload files
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={DOCUMENT_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={event => {
                        addFiles(event.target.files)
                        event.target.value = ""
                    }}
                />
            </div>

            <UploadQueue items={uploads.items} onRetry={uploads.retry} onDismiss={uploads.dismiss} />

            {documents.length === 0 ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center transition-colors hover:border-accent-1/60 md:py-20"
                >
                    <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent-1/10 text-2xl text-accent-1"><LuCloudUpload aria-hidden="true" /></span>
                    <span className="mt-4 font-semibold">Your archive is empty</span>
                    <span className="mt-1 max-w-md text-sm text-muted">Drop CVs, transcripts, certificates, project reports or contracts here, or click to choose files. PDF, images, Office files, text and ZIP up to 10 MB each.</span>
                </button>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-0 flex-1 basis-56">
                            <LuSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim" aria-hidden="true" />
                            <input
                                type="search"
                                value={filter.q}
                                maxLength={100}
                                onChange={event => setFilterValue("q", event.target.value)}
                                placeholder="Search titles, file names, tags"
                                aria-label="Search documents"
                                className={`${inputClass} pl-9`}
                            />
                        </div>
                        <select value={filter.sort} onChange={event => setFilterValue("sort", event.target.value as DocumentSort)} aria-label="Sort documents" className={`${inputClass} w-auto [&>option]:bg-card`}>
                            {DOCUMENT_SORTS.map(sort => <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>)}
                        </select>
                        <div className="flex rounded-full border border-white/10 p-1" role="group" aria-label="View">
                            <button type="button" aria-pressed={view === "list"} onClick={() => changeView("list")} aria-label="List view" className={`inline-flex size-8 items-center justify-center rounded-full ${view === "list" ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}><LuList aria-hidden="true" /></button>
                            <button type="button" aria-pressed={view === "grid"} onClick={() => changeView("grid")} aria-label="Grid view" className={`inline-flex size-8 items-center justify-center rounded-full ${view === "grid" ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}><LuGrid2X2 aria-hidden="true" /></button>
                        </div>
                    </div>

                    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by group">
                        <button type="button" aria-pressed={!filter.group && !filter.favorites && !filter.expiring} onClick={() => setFilter(current => ({ ...current, group: null, favorites: false, expiring: false }))} className={chip(!filter.group && !filter.favorites && !filter.expiring)}>
                            All {count(documents.length)}
                        </button>
                        {DOCUMENT_GROUPS.map(group => (
                            <button key={group} type="button" aria-pressed={filter.group === group} onClick={() => setFilterValue("group", filter.group === group ? null : group)} title={DOCUMENT_GROUP_INFO[group].hint} className={chip(filter.group === group)}>
                                {DOCUMENT_GROUP_INFO[group].label} {count(counts.get(group) ?? 0)}
                            </button>
                        ))}
                        <button type="button" aria-pressed={filter.favorites} onClick={() => setFilterValue("favorites", !filter.favorites)} className={chip(filter.favorites)}>
                            ★ Favourites {count(favorites)}
                        </button>
                        <button type="button" aria-pressed={filter.expiring} onClick={() => setFilterValue("expiring", !filter.expiring)} className={chip(filter.expiring)}>
                            Expiring {count(expiring)}
                        </button>
                    </div>

                    {visible.length ? (
                        <DocumentList documents={visible} view={view} today={today} onAction={onAction} />
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                            <p className="font-semibold">No documents match</p>
                            <p className="mt-1 text-sm text-muted">Try another search or group.</p>
                            {filtered && (
                                <button type="button" onClick={() => setFilter(current => ({ ...current, q: "", group: null, favorites: false, expiring: false }))} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent-1 hover:underline">
                                    <LuX aria-hidden="true" /> Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {dragging && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" aria-hidden="true">
                    <div className="flex w-full max-w-xl flex-col items-center rounded-3xl border-2 border-dashed border-accent-1 bg-card/90 px-8 py-14 text-center">
                        <LuCloudUpload className="text-4xl text-accent-1" />
                        <p className="mt-3 text-lg font-bold">Drop to upload to {DOCUMENT_GROUP_INFO[uploadGroup].label}</p>
                        <p className="mt-1 text-sm text-muted">Up to 10 MB per file. You can change the group afterwards.</p>
                    </div>
                </div>
            )}

            {editing && <DocumentEditor key={editing.id} document={editing} onClose={() => setEditing(null)} onSaved={replace} />}
            {previewing && <DocumentPreview key={previewing.id} document={previewing} onClose={() => setPreviewing(null)} onDownload={download} />}
        </>
    )
}
