"use client"

import * as React from "react"
import { LuLoaderCircle } from "react-icons/lu"

type Pdf = Awaited<ReturnType<typeof import("unpdf").getDocumentProxy>>
type PageSize = { width: number, height: number }

type Props = {
    url: string
    onPageChange: (current: number, total: number) => void
    // Shown instead of the pages when the file can't be loaded or drawn.
    fallback: React.ReactNode
}

const MAX_PIXEL_RATIO = 2

// unpdf's types leave out the document's loadingTask; destroying it frees the parsed file
// (this is what PDF.js's own PDFDocumentProxy.destroy does).
function release (pdf: Pdf) {
    void (pdf as unknown as { loadingTask?: { destroy: () => Promise<void> } }).loadingTask?.destroy().catch(() => {})
}

// Draws a PDF with PDF.js (bundled in unpdf) instead of the browser's viewer, which phones
// won't show inside a page. Pages are drawn only near the screen and cleared when far away,
// so long documents don't exhaust memory.
export default function PdfPages ({ url, onPageChange, fallback }: Props) {
    const [pdf, setPdf] = React.useState<Pdf | null>(null)
    const [sizes, setSizes] = React.useState<PageSize[]>([])
    const [failed, setFailed] = React.useState(false)
    const [width, setWidth] = React.useState(0)
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const columnRef = React.useRef<HTMLDivElement>(null)
    const onPageChangeRef = React.useRef(onPageChange)

    React.useEffect(() => {
        onPageChangeRef.current = onPageChange
    })

    React.useEffect(() => {
        let cancelled = false
        let loaded: Pdf | null = null
        ;(async () => {
            try {
                const response = await fetch(url)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = new Uint8Array(await response.arrayBuffer())
                const { getDocumentProxy } = await import("unpdf")
                const document = await getDocumentProxy(data)
                loaded = document
                if (cancelled) return release(document)
                const pages = await Promise.all(Array.from({ length: document.numPages }, (_, index) => document.getPage(index + 1)))
                if (cancelled) return
                setSizes(pages.map(page => {
                    const viewport = page.getViewport({ scale: 1 })
                    return { width: viewport.width, height: viewport.height }
                }))
                setPdf(document)
                onPageChangeRef.current(1, document.numPages)
            } catch (error) {
                console.error("[documents] PDF preview failed:", error instanceof Error ? error.message : "unknown")
                if (!cancelled) setFailed(true)
            }
        })()
        return () => {
            cancelled = true
            if (loaded) release(loaded)
        }
    }, [url])

    // Page width follows the column's content box, i.e. inside its padding (debounced, so
    // resizing doesn't redraw every frame).
    React.useEffect(() => {
        const column = columnRef.current
        if (!column) return
        let timer: ReturnType<typeof setTimeout> | undefined
        const observer = new ResizeObserver(entries => {
            const next = Math.floor(entries[0]?.contentRect.width ?? 0)
            clearTimeout(timer)
            timer = setTimeout(() => setWidth(next), 150)
        })
        observer.observe(column)
        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [pdf])

    function onScroll () {
        const container = scrollRef.current
        if (!container || !sizes.length) return
        const mark = container.scrollTop + container.clientHeight / 3
        let current = 1
        for (const element of container.querySelectorAll<HTMLElement>("[data-page]")) {
            if (element.offsetTop <= mark) current = Number(element.dataset.page)
        }
        onPageChangeRef.current(current, sizes.length)
    }

    if (failed) return <>{fallback}</>
    if (!pdf) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-white/75" role="status">
                <LuLoaderCircle className="animate-spin text-accent-1" aria-hidden="true" /> Loading document…
            </div>
        )
    }

    return (
        <div ref={scrollRef} onScroll={onScroll} className="relative h-full overflow-y-auto overscroll-contain">
            <div ref={columnRef} className="mx-auto flex w-full max-w-225 flex-col gap-3 p-2 md:gap-4 md:p-6">
                {width > 0 && sizes.map((size, index) => (
                    <PdfPage key={index} pdf={pdf} number={index + 1} size={size} width={width} />
                ))}
            </div>
        </div>
    )
}

function PdfPage ({ pdf, number, size, width }: { pdf: Pdf, number: number, size: PageSize, width: number }) {
    const holderRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const [near, setNear] = React.useState(false)
    const height = Math.round((width * size.height) / size.width)

    React.useEffect(() => {
        const holder = holderRef.current
        if (!holder) return
        const observer = new IntersectionObserver(entries => setNear(entries[0]?.isIntersecting ?? false), { rootMargin: "1200px 0px" })
        observer.observe(holder)
        return () => observer.disconnect()
    }, [])

    React.useEffect(() => {
        const canvas = canvasRef.current
        if (!near || !canvas || width <= 0) return
        let task: { cancel: () => void, promise: Promise<void> } | null = null
        let cancelled = false
        pdf.getPage(number).then(page => {
            if (cancelled) return
            const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
            const viewport = page.getViewport({ scale: (width / size.width) * ratio })
            canvas.width = Math.floor(viewport.width)
            canvas.height = Math.floor(viewport.height)
            task = page.render({ canvas, viewport })
            return task.promise
        }).catch(error => {
            if (error?.name !== "RenderingCancelledException") console.error("[documents] page render failed:", error?.message)
        })
        return () => {
            cancelled = true
            task?.cancel()
        }
    }, [near, pdf, number, size.width, width])

    return (
        <div ref={holderRef} data-page={number} style={{ height }} className="relative w-full shrink-0 bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
            {near && <canvas ref={canvasRef} aria-label={`Page ${number}`} role="img" className="block size-full" />}
        </div>
    )
}
