"use client"

import * as React from "react"
import { LuDownload, LuLoaderCircle, LuX } from "react-icons/lu"
import { adminFetch } from "@/lib/admin/client"
import { formatBytes, type DocumentRecord } from "@/lib/documents/schema"

type Props = {
    document: DocumentRecord
    onClose: () => void
    onDownload: (document: DocumentRecord) => void
}

// PDFs and images only, through a 5-minute signed URL (enough to open it; the browser keeps the loaded file).
export default function DocumentPreview ({ document: doc, onClose, onDownload }: Props) {
    const ref = React.useRef<HTMLDialogElement>(null)
    const titleId = React.useId()
    const [url, setUrl] = React.useState<string | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        const opener = window.document.activeElement as HTMLElement | null
        dialog.showModal()
        return () => opener?.focus?.()
    }, [])

    React.useEffect(() => {
        let cancelled = false
        adminFetch<{ url: string }>(`/api/admin/documents/${doc.id}/link`, { json: { purpose: "preview" } }).then(result => {
            if (cancelled) return
            if (result.ok) setUrl(result.data.url)
            else setError(result.error.message)
        })
        return () => { cancelled = true }
    }, [doc.id])

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={event => { event.preventDefault(); onClose() }}
            onKeyDown={event => { if (event.key === "Escape") event.stopPropagation() }}
            className="m-0 h-dvh max-h-none w-full max-w-none animate-fade-in bg-card p-0 text-fg backdrop:bg-black/75 backdrop:backdrop-blur-sm md:m-auto md:h-[88dvh] md:w-[min(1100px,92vw)] md:overflow-hidden md:rounded-2xl md:border md:border-white/10"
        >
            <div className="flex h-full flex-col">
                <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3 md:px-5">
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="truncate text-sm font-bold md:text-base">{doc.title}</h2>
                        <p className="truncate text-xs text-dim">{doc.file_name} · {formatBytes(doc.size_bytes)}</p>
                    </div>
                    <button type="button" onClick={() => onDownload(doc)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold hover:border-accent-1">
                        <LuDownload aria-hidden="true" /> <span className="max-sm:sr-only">Download</span>
                    </button>
                    <button type="button" onClick={onClose} aria-label="Close preview" className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-white/8 hover:text-white">
                        <LuX className="text-lg" aria-hidden="true" />
                    </button>
                </header>
                <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/30">
                    {error ? (
                        <p className="p-6 text-center text-sm text-rose-300">{error}</p>
                    ) : !url ? (
                        <LuLoaderCircle className="animate-spin text-2xl text-accent-1" aria-label="Loading preview" />
                    ) : doc.format === "pdf" ? (
                        <iframe src={url} title={doc.title} className="size-full border-0 bg-white" />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file
                        <img src={url} alt={doc.title} className="max-h-full max-w-full object-contain p-2 md:p-4" />
                    )}
                </div>
            </div>
        </dialog>
    )
}
