"use client"

// Browser-side PDF generation. @react-pdf/renderer is loaded on demand so it never lands
// in the initial dashboard bundle.

import type { ReactElement } from "react"
import type { DocumentProps } from "@react-pdf/renderer"

export async function renderPdfBlob (element: () => Promise<ReactElement<DocumentProps>>): Promise<{ blob: Blob, pages: number }> {
    const [{ pdf }, { registerResumeFonts }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/resume/pdf/shared")])
    registerResumeFonts(window.location.origin)
    const blob = await pdf(await element()).toBlob()
    // Count page objects ("/Type /Page", not "/Pages") in the generated file.
    const text = await blob.text()
    const pages = (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length || 1
    return { blob, pages }
}

// @react-pdf can only embed JPEG and PNG, while photos are stored as WebP (resized in the
// browser). Re-encode any image URL to a JPEG data URL, cached per URL.
const pdfImages = new Map<string, Promise<string | null>>()

export function toPdfImage (url: string | null): Promise<string | null> {
    if (!url) return Promise.resolve(null)
    const key = url.split("?")[0]
    let pending = pdfImages.get(key)
    if (!pending) {
        pending = (async () => {
            try {
                const response = await fetch(url)
                if (!response.ok) return null
                const bitmap = await createImageBitmap(await response.blob())
                const canvas = document.createElement("canvas")
                canvas.width = bitmap.width
                canvas.height = bitmap.height
                const context = canvas.getContext("2d")
                if (!context) return null
                context.fillStyle = "#ffffff" // transparent PNG/WebP areas become white, not black
                context.fillRect(0, 0, canvas.width, canvas.height)
                context.drawImage(bitmap, 0, 0)
                bitmap.close()
                return canvas.toDataURL("image/jpeg", 0.92)
            } catch {
                return null
            }
        })()
        pdfImages.set(key, pending)
        // Don't cache failures (e.g. an expired signed URL); a fresh URL can retry.
        void pending.then(result => { if (!result) pdfImages.delete(key) })
    }
    return pending
}

export function downloadBlob (blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function safeFilename (value: string) {
    return (value.trim().replace(/[^\w\s.-]+/g, "").replace(/\s+/g, "-").slice(0, 80) || "resume") + ".pdf"
}
