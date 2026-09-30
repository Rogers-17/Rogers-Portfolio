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
