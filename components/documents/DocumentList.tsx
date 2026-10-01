"use client"

import * as React from "react"
import { LuDownload, LuEye, LuLink, LuEllipsis, LuPencil, LuStar, LuTrash2 } from "react-icons/lu"
import FileTypeIcon from "@/components/documents/FileTypeIcon"
import { DOCUMENT_GROUP_INFO, PREVIEWABLE, expiryState, formatBytes, type DocumentRecord } from "@/lib/documents/schema"

export type DocumentAction = "preview" | "download" | "share-1h" | "share-24h" | "edit" | "favorite" | "delete"

type ListProps = {
    documents: DocumentRecord[]
    view: "list" | "grid"
    today: string
    onAction: (document: DocumentRecord, action: DocumentAction) => void
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
export const formatDate = (value: string) => dateFormat.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value))

export default function DocumentList ({ documents, view, today, onAction }: ListProps) {
    if (view === "grid") {
        return (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {documents.map(document => <GridCard key={document.id} document={document} today={today} onAction={onAction} />)}
            </ul>
        )
    }
    return (
        <ul className="flex flex-col gap-2">
            {documents.map(document => <ListRow key={document.id} document={document} today={today} onAction={onAction} />)}
        </ul>
    )
}

// Clicking the item opens a preview when possible, otherwise downloads it.
const openAction = (document: DocumentRecord): DocumentAction => (PREVIEWABLE.includes(document.format) ? "preview" : "download")

function ListRow ({ document, today, onAction }: { document: DocumentRecord, today: string, onAction: ListProps["onAction"] }) {
    return (
        <li className="group relative flex items-center gap-3 rounded-2xl border border-white/6 bg-card p-3 transition-colors hover:border-white/15 md:gap-4 md:px-4">
            <button type="button" onClick={() => onAction(document, openAction(document))} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-1 md:gap-4" aria-label={`${PREVIEWABLE.includes(document.format) ? "Preview" : "Download"} ${document.title}`}>
                <FileTypeIcon format={document.format} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold md:text-[15px]">{document.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-dim">{document.file_name} · {formatBytes(document.size_bytes)}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5 lg:hidden">
                        <Meta document={document} today={today} />
                    </span>
                </span>
                <span className="hidden max-w-[45%] shrink-0 flex-wrap items-center justify-end gap-1.5 lg:flex">
                    <Meta document={document} today={today} />
                    <span className="ml-1 text-xs whitespace-nowrap text-dim">Added {formatDate(document.created_at)}</span>
                </span>
            </button>
            <FavoriteButton document={document} onAction={onAction} />
            <ActionsMenu document={document} onAction={onAction} />
        </li>
    )
}

function GridCard ({ document, today, onAction }: { document: DocumentRecord, today: string, onAction: ListProps["onAction"] }) {
    const [thumbFailed, setThumbFailed] = React.useState(false)
    return (
        <li className="group relative flex flex-col rounded-2xl border border-white/6 bg-card transition-colors hover:border-white/15">
            <button type="button" onClick={() => onAction(document, openAction(document))} className="flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 rounded-2xl" aria-label={`${PREVIEWABLE.includes(document.format) ? "Preview" : "Download"} ${document.title}`}>
                <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-2xl bg-white/3">
                    {document.thumb_url && !thumbFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file
                        <img src={document.thumb_url} alt="" loading="lazy" decoding="async" onError={() => setThumbFailed(true)} className="size-full object-cover" />
                    ) : (
                        <FileTypeIcon format={document.format} size="lg" />
                    )}
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-3.5">
                    <span className="line-clamp-2 text-sm font-semibold">{document.title}</span>
                    <span className="truncate text-xs text-dim">{formatBytes(document.size_bytes)} · {formatDate(document.created_at)}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1"><Meta document={document} today={today} compact /></span>
                </span>
            </button>
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 p-0.5 backdrop-blur">
                <FavoriteButton document={document} onAction={onAction} />
                <ActionsMenu document={document} onAction={onAction} />
            </div>
        </li>
    )
}

function Meta ({ document, today, compact = false }: { document: DocumentRecord, today: string, compact?: boolean }) {
    const expiry = expiryState(document.expires_on, today)
    const tags = compact ? document.tags.slice(0, 2) : document.tags.slice(0, 4)
    return (
        <>
            <span className="rounded-full bg-accent-1/10 px-2 py-0.5 text-[11px] font-semibold text-accent-1">{DOCUMENT_GROUP_INFO[document.category].label}</span>
            {expiry && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${expiry === "expired" ? "bg-rose-500/15 text-rose-200" : "bg-amber-400/15 text-amber-100"}`} title={document.expires_on ? `Expires ${formatDate(document.expires_on)}` : undefined}>
                    {expiry === "expired" ? "Expired" : "Expires soon"}
                </span>
            )}
            {tags.map(tag => <span key={tag} className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-muted">#{tag}</span>)}
            {document.tags.length > tags.length && <span className="text-[11px] text-dim">+{document.tags.length - tags.length}</span>}
        </>
    )
}

function FavoriteButton ({ document, onAction }: { document: DocumentRecord, onAction: ListProps["onAction"] }) {
    return (
        <button
            type="button"
            onClick={() => onAction(document, "favorite")}
            aria-pressed={document.is_favorite}
            aria-label={document.is_favorite ? `Remove ${document.title} from favourites` : `Add ${document.title} to favourites`}
            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/8 ${document.is_favorite ? "text-amber-300" : "text-dim hover:text-white"}`}
        >
            <LuStar className={document.is_favorite ? "fill-current" : ""} aria-hidden="true" />
        </button>
    )
}

// Popover on tablets/desktop, bottom sheet on phones.
function ActionsMenu ({ document, onAction }: { document: DocumentRecord, onAction: ListProps["onAction"] }) {
    const [open, setOpen] = React.useState(false)
    const rootRef = React.useRef<HTMLDivElement>(null)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const menuId = React.useId()

    React.useEffect(() => {
        if (!open) return
        rootRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus()
        const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false)
                triggerRef.current?.focus()
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const items = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])]
                const index = items.indexOf(window.document.activeElement as HTMLButtonElement)
                const next = items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]
                next?.focus()
                event.preventDefault()
            }
        }
        window.document.addEventListener("pointerdown", onPointer)
        window.document.addEventListener("keydown", onKey)
        return () => {
            window.document.removeEventListener("pointerdown", onPointer)
            window.document.removeEventListener("keydown", onKey)
        }
    }, [open])

    const run = (action: DocumentAction) => {
        setOpen(false)
        onAction(document, action)
    }
    const item = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg/90 hover:bg-white/6 focus-visible:bg-white/8 focus-visible:outline-none md:min-h-9"

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Actions for ${document.title}`}
                className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/8 hover:text-white"
            >
                <LuEllipsis aria-hidden="true" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50 md:hidden" aria-hidden="true" />
                    <div
                        id={menuId}
                        role="menu"
                        aria-label={`Actions for ${document.title}`}
                        className="fixed inset-x-0 bottom-0 z-50 animate-fade-in rounded-t-2xl border border-white/10 bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] md:absolute md:inset-x-auto md:top-full md:right-0 md:bottom-auto md:mt-1 md:w-60 md:rounded-xl md:pb-2 md:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]"
                    >
                        <p className="truncate px-3 pt-1 pb-2 text-xs font-semibold text-dim md:hidden">{document.title}</p>
                        {PREVIEWABLE.includes(document.format) && (
                            <button type="button" role="menuitem" onClick={() => run("preview")} className={item}><LuEye aria-hidden="true" className="text-muted" /> Preview</button>
                        )}
                        <button type="button" role="menuitem" onClick={() => run("download")} className={item}><LuDownload aria-hidden="true" className="text-muted" /> Download</button>
                        <div className="my-1 border-t border-white/8" role="separator" />
                        <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider text-dim uppercase">Copy temporary link</p>
                        <button type="button" role="menuitem" onClick={() => run("share-1h")} className={item}><LuLink aria-hidden="true" className="text-muted" /> Valid for 1 hour</button>
                        <button type="button" role="menuitem" onClick={() => run("share-24h")} className={item}><LuLink aria-hidden="true" className="text-muted" /> Valid for 24 hours</button>
                        <div className="my-1 border-t border-white/8" role="separator" />
                        <button type="button" role="menuitem" onClick={() => run("edit")} className={item}><LuPencil aria-hidden="true" className="text-muted" /> Edit details</button>
                        <button type="button" role="menuitem" onClick={() => run("delete")} className={`${item} text-rose-300 hover:bg-rose-500/10`}><LuTrash2 aria-hidden="true" /> Delete</button>
                    </div>
                </>
            )}
        </div>
    )
}
