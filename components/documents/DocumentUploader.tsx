"use client"

import * as React from "react"
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuRotateCw, LuX } from "react-icons/lu"
import type { DetailedError } from "tus-js-client"
import { adminFetch, type ApiResult } from "@/lib/admin/client"
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, formatBytes, formatFromName, type DocumentGroup, type DocumentRecord } from "@/lib/documents/schema"
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
// Supabase requires exactly 6 MB chunks for resumable uploads.
const CHUNK_BYTES = 6 * 1024 * 1024
// Signed upload tokens last 2 hours; sign again a little before that.
const SESSION_MS = 110 * 60 * 1000

type Session = { path: string, token: string, contentType: string, signedAt: number }
type Outcome = ApiResult<DocumentRecord> | { ok: false, cancelled: true }
type TusResult = { ok: true } | { ok: false, message: string, expired: boolean, cancelled?: boolean }

const failure = (code: string, message: string) => ({ ok: false as const, error: { code, message } })
const TOO_LARGE = `File is too large (max ${MAX_DOCUMENT_MB} MB).`

function tusErrorMessage (error: Error | DetailedError) {
    const response = "originalResponse" in error ? error.originalResponse : null
    if (!response) return { message: "Connection lost. Retry to continue where it stopped.", expired: false }
    const status = response.getStatus()
    const body = response.getBody() ?? ""
    if (status === 413 || /size|large/i.test(body)) return { message: TOO_LARGE, expired: false }
    if (status === 415 || /mime|type/i.test(body)) return { message: "That file type isn't allowed.", expired: false }
    if (status === 401 || status === 403 || /signature|expired|jwt/i.test(body)) return { message: "The upload link expired. Retry to start again.", expired: true }
    return { message: "Upload failed. Please try again.", expired: false }
}

// Resumable (TUS) upload to the signed inbox path in 6 MB chunks. Retrying with the same
// session continues from the last chunk the server accepted.
function tusUpload (file: File, session: Session, onProgress: (sent: number, total: number) => void, register: (abort: () => void) => void) {
    return new Promise<TusResult>(resolve => {
        import("tus-js-client")
            .then(({ Upload }) => {
                const upload = new Upload(file, {
                    endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable/sign`,
                    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", "x-signature": session.token },
                    uploadDataDuringCreation: true,
                    removeFingerprintOnSuccess: true,
                    chunkSize: CHUNK_BYTES,
                    retryDelays: [0, 1000, 3000, 5000, 10000],
                    // One fingerprint per server path, so the same file uploaded twice never collides.
                    fingerprint: async () => `rogers-documents:${session.path}`,
                    metadata: { bucketName: "documents", objectName: session.path, contentType: session.contentType, cacheControl: "3600" },
                    onProgress,
                    onSuccess: () => resolve({ ok: true }),
                    onError: error => resolve({ ok: false, ...tusErrorMessage(error) }),
                })
                register(() => {
                    upload.abort(true).catch(() => {})
                    resolve({ ok: false, message: "Cancelled", expired: false, cancelled: true })
                })
                upload.findPreviousUploads().then(previous => {
                    if (previous[0]) upload.resumeFromPreviousUpload(previous[0])
                    upload.start()
                })
            })
            .catch(() => resolve({ ok: false, message: "Couldn't start the upload. Reload the page and try again.", expired: false }))
    })
}

export function useDocumentUploads (onUploaded: (document: DocumentRecord) => void) {
    const [items, setItems] = React.useState<UploadItem[]>([])
    const running = React.useRef(0)
    const queue = React.useRef<UploadItem[]>([])
    const sessions = React.useRef(new Map<string, Session>())
    const aborts = React.useRef(new Map<string, () => void>())
    const onUploadedRef = React.useRef(onUploaded)
    React.useEffect(() => { onUploadedRef.current = onUploaded }, [onUploaded])

    const update = React.useCallback((key: string, patch: Partial<UploadItem>) => {
        setItems(current => current.map(item => (item.key === key ? { ...item, ...patch } : item)))
    }, [])

    // sign (or reuse the session) -> resumable upload -> server check & save.
    const uploadDocument = React.useCallback(async (item: UploadItem): Promise<Outcome> => {
        const { file, key } = item
        if (!formatFromName(file.name)) return failure("invalid_type", "This file type isn't supported.")
        if (file.size > MAX_DOCUMENT_BYTES) return failure("too_large", TOO_LARGE)
        if (file.size === 0) return failure("empty_file", "The file is empty.")

        for (let attempt = 0; ; attempt++) {
            let session = sessions.current.get(key)
            if (!session || Date.now() - session.signedAt > SESSION_MS) {
                const signed = await adminFetch<{ path: string, token: string, contentType: string }>("/api/admin/documents/sign", { json: { fileName: file.name, size: file.size } })
                if (!signed.ok) return signed
                session = { ...signed.data, signedAt: Date.now() }
                sessions.current.set(key, session)
            }

            const result = await tusUpload(
                file,
                session,
                (sent, total) => update(key, { progress: total ? sent / total : 0, status: "uploading" }),
                abort => aborts.current.set(key, abort),
            )
            aborts.current.delete(key)
            if (result.ok) break
            if (result.cancelled) {
                sessions.current.delete(key)
                return { ok: false, cancelled: true }
            }
            // An expired signature can't resume: sign a new path once and start over.
            if (result.expired) sessions.current.delete(key)
            if (result.expired && attempt === 0) continue
            return failure("upload_failed", result.message)
        }

        update(key, { status: "saving", progress: 1 })
        const session = sessions.current.get(key)!
        const saved = await adminFetch<DocumentRecord>("/api/admin/documents", { json: { path: session.path, fileName: file.name, category: item.group } })
        // A rejected file is deleted on the server, so a retry needs a fresh upload.
        if (saved.ok || saved.error.code !== "upload_failed") sessions.current.delete(key)
        return saved
    }, [update])

    const pump = React.useCallback(() => {
        const step = () => {
            while (running.current < CONCURRENCY && queue.current.length) {
                const item = queue.current.shift()!
                running.current += 1
                update(item.key, { status: "uploading", error: undefined })
                uploadDocument(item)
                    .then(result => {
                        if (result.ok) {
                            update(item.key, { status: "done", progress: 1 })
                            onUploadedRef.current(result.data)
                        } else if ("cancelled" in result) {
                            setItems(current => current.filter(entry => entry.key !== item.key))
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
    }, [update, uploadDocument])

    const add = React.useCallback((files: File[], group: DocumentGroup) => {
        const next = files.map(file => ({ key: crypto.randomUUID(), file, group, progress: 0, status: "queued" as const }))
        setItems(current => [...current.filter(item => item.status !== "done"), ...next])
        queue.current.push(...next)
        pump()
    }, [pump])

    const itemsRef = React.useRef(items)
    React.useEffect(() => { itemsRef.current = items }, [items])

    // Keeps the progress made so far: the upload resumes from the last accepted chunk.
    const retry = React.useCallback((key: string) => {
        const item = itemsRef.current.find(entry => entry.key === key)
        if (!item || item.status !== "error") return
        update(key, { status: "queued", error: undefined })
        queue.current.push(item)
        pump()
    }, [pump, update])

    // Stops a running upload (discarding the partial file) or drops a queued one.
    const cancel = React.useCallback((key: string) => {
        const abort = aborts.current.get(key)
        if (abort) return abort()
        queue.current = queue.current.filter(item => item.key !== key)
        sessions.current.delete(key)
        setItems(current => current.filter(item => item.key !== key))
    }, [])

    const dismiss = React.useCallback((key?: string) => {
        if (key) sessions.current.delete(key)
        setItems(current => (key ? current.filter(item => item.key !== key) : current.filter(item => item.status !== "done" && item.status !== "error")))
    }, [])

    // Collapse 3 s after everything has finished successfully.
    const allDone = items.length > 0 && items.every(item => item.status === "done")
    React.useEffect(() => {
        if (!allDone) return
        const timer = setTimeout(() => setItems([]), 3000)
        return () => clearTimeout(timer)
    }, [allDone])

    // Leaving the page stops running uploads (they can't finish without it).
    React.useEffect(() => {
        const active = aborts.current
        return () => { for (const abort of active.values()) abort() }
    }, [])

    return { items, add, retry, cancel, dismiss }
}

type QueueProps = {
    items: UploadItem[]
    onRetry: (key: string) => void
    onCancel: (key: string) => void
    onDismiss: (key?: string) => void
}

const smallButton = "inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/8 hover:text-white"

export function UploadQueue ({ items, onRetry, onCancel, onDismiss }: QueueProps) {
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
                    const large = item.file.size > 5 * 1024 * 1024
                    const sizeLabel = large && item.status === "uploading"
                        ? `${(item.file.size * item.progress / 1024 / 1024).toFixed(1)} of ${formatBytes(item.file.size)}`
                        : formatBytes(item.file.size)
                    return (
                        <li key={item.key} className="flex items-center gap-3 rounded-xl bg-white/3 p-2.5">
                            <FileTypeIcon format={format} size="sm" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                                    <span className="shrink-0 text-xs text-dim tabular-nums">{item.status === "saving" ? "Checking…" : sizeLabel}</span>
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
                                {item.status === "saving" && <LuLoaderCircle className="animate-spin text-lg text-accent-1" aria-label="Checking file" />}
                                {(item.status === "uploading" || item.status === "queued") && (
                                    <>
                                        {item.status === "uploading" && <LuLoaderCircle className="animate-spin text-lg text-accent-1" aria-label="Uploading" />}
                                        <button type="button" onClick={() => onCancel(item.key)} aria-label={`Cancel ${item.file.name}`} className={smallButton}><LuX aria-hidden="true" /></button>
                                    </>
                                )}
                                {item.status === "error" && (
                                    <>
                                        <LuCircleAlert className="text-lg text-rose-400" aria-hidden="true" />
                                        {format && item.file.size <= MAX_DOCUMENT_BYTES && (
                                            <button type="button" onClick={() => onRetry(item.key)} aria-label={`Retry ${item.file.name}`} className={smallButton}><LuRotateCw aria-hidden="true" /></button>
                                        )}
                                        <button type="button" onClick={() => onDismiss(item.key)} aria-label={`Dismiss ${item.file.name}`} className={smallButton}><LuX aria-hidden="true" /></button>
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
