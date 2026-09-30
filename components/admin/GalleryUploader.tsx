"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FiUploadCloud } from "react-icons/fi"
import { uploadImage } from "@/components/admin/ImageUpload"
import { useToast } from "@/components/admin/Toast"
import { adminFetch } from "@/lib/admin/client"
import { GALLERY_BULK_MAX } from "@/lib/admin/page-schemas"

// Pick several photos: each is resized in the browser, uploaded, then all are created in
// one request. New photos go to the end of the grid with a default description to edit.
export default function GalleryUploader () {
    const router = useRouter()
    const { notify } = useToast()
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [progress, setProgress] = React.useState<{ done: number, total: number } | null>(null)

    async function handleFiles (list: FileList) {
        const files = [...list].slice(0, GALLERY_BULK_MAX)
        if (list.length > GALLERY_BULK_MAX) notify(`Only the first ${GALLERY_BULK_MAX} photos were added.`, "error")

        setProgress({ done: 0, total: files.length })
        const photos: { image_path: string, width: number, height: number, alt: string }[] = []
        const failures: string[] = []

        for (const file of files) {
            const result = await uploadImage("site-images", "gallery", file, 2400)
            if (result.ok && result.data.width && result.data.height) {
                photos.push({ image_path: result.data.path, width: result.data.width, height: result.data.height, alt: "Gallery photo" })
            } else {
                failures.push(`${file.name}: ${result.ok ? "couldn't read the image size" : result.error.message}`)
            }
            setProgress(current => (current ? { ...current, done: current.done + 1 } : current))
        }

        if (inputRef.current) inputRef.current.value = ""

        if (photos.length > 0) {
            const created = await adminFetch("/api/admin/gallery-photos/bulk", { json: { photos } })
            if (created.ok) notify(`${photos.length} photo${photos.length === 1 ? "" : "s"} added. Edit each one to add a description.`)
            else notify(created.error.message, "error")
        }
        if (failures.length > 0) notify(`Some photos failed. ${failures.slice(0, 2).join(" · ")}`, "error")

        setProgress(null)
        router.refresh()
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={progress !== null}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/3 px-4 py-8 text-sm text-muted transition-colors hover:border-accent-1 hover:text-white disabled:cursor-wait"
            >
                <FiUploadCloud className="text-2xl" aria-hidden="true" />
                {progress ? `Uploading ${progress.done}/${progress.total}…` : "Upload photos"}
                <span className="text-xs text-dim">Select up to {GALLERY_BULK_MAX} at once. Large photos are resized automatically.</span>
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label="Upload photos"
                onChange={event => {
                    if (event.target.files?.length) void handleFiles(event.target.files)
                }}
            />
        </div>
    )
}
