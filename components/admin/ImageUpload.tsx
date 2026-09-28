"use client"

import * as React from "react"
import Image from "next/image"
import { FiUploadCloud, FiX } from "react-icons/fi"
import { adminFetch } from "@/lib/admin/client"
import type { StorageBucket } from "@/lib/storage"

type Props = {
    bucket: StorageBucket
    folder: string
    path: string | null
    url: string | null
    onChange: (value: { path: string, url: string } | null) => void
    label?: string
    aspectClass?: string
    error?: string
}

const ACCEPT: Record<StorageBucket, string> = {
    "project-images": "image/png,image/jpeg,image/webp,image/avif,image/gif",
    "tech-icons": "image/svg+xml,image/png,image/webp",
    "site-images": "image/png,image/jpeg,image/webp,image/avif",
}

export default function ImageUpload ({ bucket, folder, path, url, onChange, label = "Upload image", aspectClass = "aspect-[16/10]", error }: Props) {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = React.useState(false)
    const [uploadError, setUploadError] = React.useState<string | null>(null)

    async function handleFile (file: File) {
        setUploading(true)
        setUploadError(null)
        const body = new FormData()
        body.set("bucket", bucket)
        body.set("folder", folder)
        body.set("file", file)

        const result = await adminFetch<{ path: string, url: string }>("/api/admin/uploads", { body })
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""

        if (result.ok) onChange(result.data)
        else setUploadError(result.error.message)
    }

    const message = uploadError ?? error

    return (
        <div className="flex flex-col gap-2">
            <div className={`relative overflow-hidden rounded-xl border border-dashed ${message ? "border-rose-500" : "border-white/15"} bg-white/3 ${aspectClass}`}>
                {url && path ? (
                    <>
                        <Image src={url} alt="" fill unoptimized sizes="400px" className="object-contain" />
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            aria-label="Remove image"
                            className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-rose-600"
                        >
                            <FiX aria-hidden="true" />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted transition-colors hover:text-white disabled:cursor-wait"
                    >
                        <FiUploadCloud className="text-2xl" aria-hidden="true" />
                        {uploading ? "Uploading…" : label}
                    </button>
                )}
            </div>
            {url && path && (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="self-start text-xs font-semibold text-muted underline-offset-4 hover:text-white hover:underline">
                    {uploading ? "Uploading…" : "Replace"}
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT[bucket]}
                className="sr-only"
                tabIndex={-1}
                aria-label={label}
                onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) void handleFile(file)
                }}
            />
            {message && <p className="text-xs text-rose-400" role="alert">{message}</p>}
        </div>
    )
}
