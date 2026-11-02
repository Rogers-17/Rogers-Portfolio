"use client"

import * as React from "react"
import Link from "next/link"
import { LuDownload, LuLoaderCircle } from "react-icons/lu"
import FileTypeIcon from "@/components/documents/FileTypeIcon"
import PdfPages from "@/components/documents/PdfPages"
import { IMAGE_FORMATS, formatBytes, type DocumentFormat } from "@/lib/documents/schema"

type Props = {
    title: string
    fileName: string
    format: DocumentFormat
    size: number
    // Short-lived signed URL for viewing (not a download).
    url: string
    downloadHref: string
}

const TEXT_FORMATS: readonly DocumentFormat[] = ["txt", "md", "csv"]
const TEXT_LIMIT = 1024 * 1024

const downloadClass = "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-4 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] transition-shadow hover:shadow-[0_6px_30px_rgba(222,14,255,0.4)] sm:px-5"

const brand = <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text font-bold text-transparent uppercase">Rogers</span>

// The public page behind a document share link: the file itself, with downloading as an option.
export default function SharedDocumentView ({ title, fileName, format, size, url, downloadHref }: Props) {
    const [pages, setPages] = React.useState<{ current: number, total: number } | null>(null)
    const onPageChange = React.useCallback((current: number, total: number) => setPages({ current, total }), [])

    const noPreview = (message: string) => <NoPreview format={format} fileName={fileName} size={size} message={message} downloadHref={downloadHref} />

    let body: React.ReactNode
    if (format === "pdf") body = <PdfPages url={url} onPageChange={onPageChange} fallback={noPreview("This PDF couldn't be shown here. You can still download it.")} />
    else if (IMAGE_FORMATS.includes(format)) body = <ImagePreview url={url} title={title} fallback={noPreview("This image couldn't be shown here. You can still download it.")} />
    else if (TEXT_FORMATS.includes(format)) body = <TextPreview url={url} size={size} fallback={noPreview("This file couldn't be shown here. You can still download it.")} />
    else body = noPreview("This file can't be previewed in the browser.")

    return (
        <main className="flex h-dvh flex-col bg-surface">
            <header className="flex items-center gap-3 border-b border-white/6 bg-card px-4 py-3 md:px-6">
                <FileTypeIcon format={format} size="sm" />
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-sm font-bold md:text-base">{title}</h1>
                    <p className="truncate text-xs text-muted">Shared document · {format.toUpperCase()} · {formatBytes(size)}</p>
                </div>
                {pages && <p className="hidden shrink-0 text-xs text-muted sm:block" aria-live="polite">Page {pages.current} of {pages.total}</p>}
                <a href={downloadHref} rel="nofollow" className={downloadClass}>
                    <LuDownload aria-hidden="true" /> <span className="max-sm:sr-only">Download</span>
                </a>
                <Link href="/" className="hidden shrink-0 text-xs text-dim hover:text-white md:block">Powered by {brand}</Link>
            </header>
            <div className={`min-h-0 flex-1 ${format === "pdf" ? "bg-[#525659]" : ""}`}>{body}</div>
            <footer className="border-t border-white/6 bg-card px-4 py-2 text-center md:hidden">
                <Link href="/" className="text-xs text-dim hover:text-white">Powered by {brand}</Link>
            </footer>
        </main>
    )
}

function ImagePreview ({ url, title, fallback }: { url: string, title: string, fallback: React.ReactNode }) {
    const [failed, setFailed] = React.useState(false)
    if (failed) return <>{fallback}</>
    return (
        <div className="flex h-full items-center justify-center p-2 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file */}
            <img src={url} alt={title} onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
        </div>
    )
}

// Plain text only (React escapes it; Markdown is never rendered as HTML). Reads at most 1 MB.
function TextPreview ({ url, size, fallback }: { url: string, size: number, fallback: React.ReactNode }) {
    const [text, setText] = React.useState<string | null>(null)
    const [failed, setFailed] = React.useState(false)

    React.useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        ;(async () => {
            try {
                const response = await fetch(url, { signal: controller.signal })
                if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
                const reader = response.body.getReader()
                const chunks: Uint8Array[] = []
                let total = 0
                while (total < TEXT_LIMIT) {
                    const { done, value } = await reader.read()
                    if (done) break
                    chunks.push(value)
                    total += value.byteLength
                }
                reader.cancel().catch(() => {})
                const joined = new Uint8Array(total)
                let offset = 0
                for (const chunk of chunks) {
                    joined.set(chunk, offset)
                    offset += chunk.byteLength
                }
                if (!cancelled) setText(new TextDecoder().decode(joined.subarray(0, TEXT_LIMIT)))
            } catch {
                if (!cancelled) setFailed(true)
            }
        })()
        return () => {
            cancelled = true
            controller.abort()
        }
    }, [url])

    if (failed) return <>{fallback}</>
    if (text === null) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted" role="status">
                <LuLoaderCircle className="animate-spin text-accent-1" aria-hidden="true" /> Loading document…
            </div>
        )
    }
    return (
        <div className="h-full overflow-y-auto p-2 md:p-6">
            <div className="mx-auto max-w-225">
                <pre className="rounded-2xl border border-white/6 bg-card p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-fg/90 md:p-6">{text}</pre>
                {size > TEXT_LIMIT && <p className="mt-3 text-center text-xs text-dim">Showing the first 1 MB. Download the file to see all of it.</p>}
            </div>
        </div>
    )
}

function NoPreview ({ format, fileName, size, message, downloadHref }: { format: DocumentFormat, fileName: string, size: number, message: string, downloadHref: string }) {
    return (
        <div className="flex h-full items-center justify-center overflow-y-auto p-4">
            <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/6 bg-card p-8 text-center">
                <FileTypeIcon format={format} size="lg" />
                <p className="mt-4 w-full font-semibold break-words">{fileName}</p>
                <p className="mt-1 text-xs text-dim">{formatBytes(size)}</p>
                <p className="mt-4 text-sm text-muted">{message}</p>
                <a href={downloadHref} rel="nofollow" className={`${downloadClass} mt-6 w-full`}>
                    <LuDownload aria-hidden="true" /> Download
                </a>
            </div>
        </div>
    )
}
