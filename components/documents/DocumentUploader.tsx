"use client"

import * as React from "react"
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuRotateCw, LuX } from "react-icons/lu"
import { adminFetch, type ApiResult } from "@/lib/admin/client"
import { MAX_DOCUMENT_BYTES, formatBytes, formatFromName, type DocumentGroup, type DocumentRecord } from "@/lib/documents/schema"
import FileTypeIcon from "@/components/documents/FileTypeIcon"

export type UploadItem = {
    key: string
    file: File
    group: DocumentGroup
    progress: number
    status: "queued" | "uploading" | "saving" | "done" | "error"
    error?: string
}

const CONCURRENCY = 3

// PUT straight to Supabase Storage with upload progress (fetch can't report it).
function putWithProgress (url: string, body: FormData, onProgress: (fraction: number) => void) {
    return new Promise<{ ok: boolean, detail: string }>(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", url)
        xhr.setRequestHeader("x-upsert", "false")
        xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded / event.total) }
        xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, detail: xhr.responseText })
        xhr.onerror = () => resolve({ ok: false, detail: "network" })
        xhr.send(body)
    })
}

// sign -> PUT -> verify & save. Returns the saved document.
async function uploadDocument (item: UploadItem, onProgress: (fraction: number) => void): Promise<ApiResult<DocumentRecord>> {
    const { file } = item
    const format = formatFromName(file.name)
    if (!format) return { ok: false, error: { code: "invalid_type", message: "This file type isn't supported." } }
    if (file.size > MAX_DOCUMENT_BYTES) return { ok: false, error: { code: "too_large", message: "File is too large (max 10 MB)." } }
    if (file.size === 0) return { ok: false, error: { code: "empty_file", message: "The file is empty." } }

    const signed = await adminFetch<{ path: string, signedUrl: string, contentType: string }>("/api/admin/documents/sign", { json: { fileName: file.name, size: file.size } })
    if (!signed.ok) return signed

    // Send the server-chosen type, never the browser's guess.
    const body = new FormData()
    body.append("cacheControl", "3600")
    body.append("", new File([file], `upload.${format}`, { type: signed.data.contentType }))
    const put = await putWithProgress(signed.data.signedUrl, body, onProgress)
    if (!put.ok) {
        const message = put.detail === "network"
            ? "Network error during upload. Check your connection and try again."
            : /size|large/i.test(put.detail) ? "File is too large (max 10 MB)." : /mime|type/i.test(put.detail) ? "That file type isn't allowed." : "Upload failed. Please try again."
        return { ok: false, error: { code: "upload_failed", message } }
    }

    return adminFetch<DocumentRecord>("/api/admin/documents", { json: { path: signed.data.path, fileName: file.name, category: item.group } })
}

export function useDocumentUploads (onUploaded: (document: DocumentRecord) => void) {
    const [items, setItems] = React.useState<UploadItem[]>([])
    const running = React.useRef(0)
    const queue = React.useRef<UploadItem[]>([])
    const onUploadedRef = React.useRef(onUploaded)
    React.useEffect(() => { onUploadedRef.current = onUploaded }, [onUploaded])

    const update = React.useCallback((key: string, patch: Partial<UploadItem>) => {
        setItems(current => current.map(item => (item.key === key ? { ...item, ...patch } : item)))
    }, [])

    const pump = React.useCallback(() => {
        const step = () => {
            while (running.current < CONCURRENCY && queue.current.length) {
                const item = queue.current.shift()!
                running.current += 1
                update(item.key, { status: "uploading", progress: 0, error: undefined })
                uploadDocument(item, fraction => update(item.key, { progress: fraction, status: fraction >= 1 ? "saving" : "uploading" }))
                    .then(result => {
                        if (result.ok) {
                            update(item.key, { status: "done", progress: 1 })
                            onUploadedRef.current(result.data)
                        } else {
                            update(item.key, { status: "error", error: result.error.message })
                        }
                    })
                    .finally(() => {
                        running.current -= 1
                        step()
                    })
            }
        }
        step()
    }, [update])

    const add = React.useCallback((files: File[], group: DocumentGroup) => {
        const next = files.map(file => ({ key: crypto.randomUUID(), file, group, progress: 0, status: "queued" as const }))
        setItems(current => [...current.filter(item => item.status !== "done"), ...next])
        queue.current.push(...next)
        pump()
    }, [pump])

    const itemsRef = React.useRef(items)
    React.useEffect(() => { itemsRef.current = items }, [items])

    const retry = React.useCallback((key: string) => {
        const item = itemsRef.current.find(entry => entry.key === key)
        if (!item || item.status !== "error") return
        update(key, { status: "queued", progress: 0, error: undefined })
        queue.current.push(item)
        pump()
    }, [pump, update])

    const dismiss = React.useCallback((key?: string) => {
        setItems(current => (key ? current.filter(item => item.key !== key) : current.filter(item => item.status !== "done" && item.status !== "error")))
    }, [])

    // Collapse 3 s after everything has finished successfully.
    const allDone = items.length > 0 && items.every(item => item.status === "done")
    React.useEffect(() => {
        if (!allDone) return
        const timer = setTimeout(() => setItems([]), 3000)
        return () => clearTimeout(timer)
    }, [allDone])

    return { items, add, retry, dismiss }
}

export function UploadQueue ({ items, onRetry, onDismiss }: { items: UploadItem[], onRetry: (key: string) => void, onDismiss: (key?: string) => void }) {
    if (!items.length) return null
    const finished = items.filter(item => item.status === "done").length
    const active = items.some(item => item.status === "queued" || item.status === "uploading" || item.status === "saving")

    return (
        <section aria-label="Uploads" className="mb-5 rounded-2xl border border-white/10 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold" aria-live="polite">
                    {active ? `Uploading ${finished} of ${items.length}…` : `${finished} of ${items.length} uploaded`}
                </p>
                {!active && (
                    <button type="button" onClick={() => onDismiss()} className="text-xs font-semibold text-muted hover:text-white">Clear</button>
                )}
            </div>
            <ul className="flex flex-col gap-2">
                {items.map(item => {
                    const format = formatFromName(item.file.name)
                    return (
                        <li key={item.key} className="flex items-center gap-3 rounded-xl bg-white/3 p-2.5">
                            <FileTypeIcon format={format} size="sm" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                                    <span className="shrink-0 text-xs text-dim">{formatBytes(item.file.size)}</span>
                                </div>
                                {item.status === "error" ? (
                                    <p className="mt-1 text-xs text-rose-300">{item.error}</p>
                                ) : (
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label={`${item.file.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)}>
                                        <div className={`h-full rounded-full transition-[width] duration-200 ${item.status === "done" ? "bg-emerald-400" : "bg-linear-65/srgb from-accent-1 to-accent-2"}`} style={{ width: `${Math.max(item.status === "queued" ? 0 : 4, item.progress * 100)}%` }} />
                                    </div>
                                )}
                            </div>
                            <span className="flex shrink-0 items-center gap-1">
                                {item.status === "done" && <LuCircleCheck className="text-lg text-emerald-400" aria-label="Uploaded" />}
                                {(item.status === "uploading" || item.status === "saving") && <LuLoaderCircle className="animate-spin text-lg text-accent-1" aria-label={item.status === "saving" ? "Checking file" : "Uploading"} />}
                                {item.status === "error" && (
                                    <>
                                        <LuCircleAlert className="text-lg text-rose-400" aria-hidden="true" />
                                        {formatFromName(item.file.name) && item.file.size <= MAX_DOCUMENT_BYTES && (
                                            <button type="button" onClick={() => onRetry(item.key)} aria-label={`Retry ${item.file.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/8 hover:text-white"><LuRotateCw aria-hidden="true" /></button>
                                        )}
                                        <button type="button" onClick={() => onDismiss(item.key)} aria-label={`Dismiss ${item.file.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/8 hover:text-white"><LuX aria-hidden="true" /></button>
                                    </>
                                )}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
