"use client"

import * as React from "react"
import type { ReactElement } from "react"
import type { DocumentProps } from "@react-pdf/renderer"
import { LuDownload, LuExternalLink, LuLoaderCircle } from "react-icons/lu"
import { downloadBlob, renderPdfBlob, safeFilename, toPdfImage } from "@/components/resume/pdf/client"
import type { ResumeData, ResumeDesign, TemplateKey } from "@/lib/resume/schema"

const DEBOUNCE_MS = 700

type ViewerProps = {
    // Changes whenever the document content changes (triggers a re-render).
    documentKey: string
    build: () => Promise<ReactElement<DocumentProps>>
    filename: string
    onPages?: (pages: number) => void
    className?: string
    // Hide the Open / PDF buttons (shared links with downloads turned off).
    allowDownload?: boolean
}

// The preview IS the PDF: the same document is rendered to a blob and shown in the
// browser's PDF viewer, so the download always matches what you see.
export function PdfViewer ({ documentKey, build, filename, onPages, className = "", allowDownload = true }: ViewerProps) {
    const [url, setUrl] = React.useState<string | null>(null)
    const [blob, setBlob] = React.useState<Blob | null>(null)
    const [pages, setPages] = React.useState(0)
    const [busy, setBusy] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const buildRef = React.useRef(build)
    const onPagesRef = React.useRef(onPages)

    React.useEffect(() => {
        buildRef.current = build
        onPagesRef.current = onPages
    })

    React.useEffect(() => {
        let cancelled = false
        const timer = setTimeout(async () => {
            setBusy(true)
            try {
                const result = await renderPdfBlob(() => buildRef.current())
                if (cancelled) return
                const next = URL.createObjectURL(result.blob)
                setUrl(previous => {
                    if (previous) setTimeout(() => URL.revokeObjectURL(previous), 5000)
                    return next
                })
                setBlob(result.blob)
                setPages(result.pages)
                onPagesRef.current?.(result.pages)
                setError(null)
            } catch (renderError) {
                console.error("[resume] preview failed:", renderError)
                if (!cancelled) setError("The preview couldn't be generated. If you just added a photo, try re-uploading it.")
            } finally {
                if (!cancelled) setBusy(false)
            }
        }, DEBOUNCE_MS)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [documentKey])

    return (
        <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/6 bg-[#0b0712] ${className}`}>
            <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-2.5">
                <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
                    {busy && <LuLoaderCircle className="animate-spin text-accent-1" aria-hidden="true" />}
                    {busy ? "Updating preview…" : `${pages} page${pages === 1 ? "" : "s"}`}
                </p>
                {allowDownload && <div className="flex items-center gap-1">
                    {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted hover:bg-white/6 hover:text-white">
                            <LuExternalLink aria-hidden="true" /> Open
                        </a>
                    )}
                    <button
                        type="button"
                        disabled={!blob}
                        onClick={() => blob && downloadBlob(blob, safeFilename(filename))}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-linear-65/srgb from-accent-1 to-accent-2 px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                        <LuDownload aria-hidden="true" /> PDF
                    </button>
                </div>}
            </div>
            <div className="relative min-h-0 flex-1 bg-[#525659]">
                {error && <p className="absolute inset-x-4 top-4 z-10 rounded-lg bg-rose-950/90 p-3 text-sm text-rose-100">{error}</p>}
                {url ? (
                    <iframe title="PDF preview" src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="size-full min-h-[70vh] border-0" />
                ) : (
                    <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-white/70">
                        <LuLoaderCircle className="mr-2 animate-spin" aria-hidden="true" /> Building your PDF…
                    </div>
                )}
            </div>
        </div>
    )
}

type Props = {
    template: TemplateKey
    design: ResumeDesign
    data: ResumeData
    photoUrl: string | null
    title: string
    onPages?: (pages: number) => void
    className?: string
}

export default function PdfPreview ({ template, design, data, photoUrl, title, onPages, className }: Props) {
    return (
        <PdfViewer
            documentKey={JSON.stringify({ template, design, data, photoUrl, title })}
            build={async () => {
                const [{ default: ResumeDocument }, photo] = await Promise.all([
                    import("@/components/resume/pdf/ResumeDocument"),
                    design.showPhoto ? toPdfImage(photoUrl) : Promise.resolve(null),
                ])
                return <ResumeDocument template={template} design={design} data={data} photoUrl={photo} title={title} />
            }}
            filename={title}
            onPages={onPages}
            className={className}
        />
    )
}
