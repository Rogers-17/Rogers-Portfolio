"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, Switch, TextField } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { useToast } from "@/components/admin/Toast"
import { adminFetch } from "@/lib/admin/client"
import type { AdminGalleryPhoto } from "@/lib/admin/page-queries"
import { galleryPhotoInputSchema } from "@/lib/admin/page-schemas"

type FormState = {
    image_path: string | null
    url: string | null
    width: number
    height: number
    alt: string
    caption: string
    is_published: boolean
}

const toPayload = (state: FormState) => {
    const payload: Partial<FormState> = { ...state }
    delete payload.url
    return payload
}

export default function GalleryPhotoForm ({ photo }: { photo: AdminGalleryPhoto }) {
    const router = useRouter()
    const { notify } = useToast()
    const [deleting, setDeleting] = React.useState(false)
    const form = useSaveForm<FormState>({
        initial: {
            image_path: photo.image_path,
            url: photo.url,
            width: photo.width,
            height: photo.height,
            alt: photo.alt,
            caption: photo.caption ?? "",
            is_published: photo.is_published,
        },
        toPayload,
        schema: galleryPhotoInputSchema,
        endpoint: `/api/admin/gallery-photos/${photo.id}`,
        successMessage: "Photo saved.",
    })
    const { state, set, errors } = form

    async function handleDelete () {
        if (!window.confirm("Delete this photo? This can't be undone.")) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/gallery-photos/${photo.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        form.markSaved()
        notify("Photo deleted.")
        router.replace("/admin/gallery")
        router.refresh()
    }

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/gallery" className="text-sm text-muted hover:text-white">← Gallery</Link>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">Edit photo</h1>
            </div>

            <Card title="Photo" hint="Replacing the image keeps its position in the grid.">
                <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
                    <ImageUpload
                        bucket="site-images"
                        folder="gallery"
                        resize={2400}
                        path={state.image_path}
                        url={state.url}
                        onChange={value => form.setState(current => ({
                            ...current,
                            image_path: value?.path ?? null,
                            url: value?.url ?? null,
                            width: value?.width ?? current.width,
                            height: value?.height ?? current.height,
                        }))}
                        label="Upload photo"
                        aspectClass="aspect-4/5"
                        error={errors.image_path}
                    />
                    <div className="flex flex-col gap-5">
                        <TextField label="Description (alt text)" value={state.alt} onChange={event => set("alt", event.target.value)} error={errors.alt} hint="What's in the photo, for screen readers and search engines." maxLength={200} required />
                        <TextField label="Caption" value={state.caption} onChange={event => set("caption", event.target.value)} error={errors.caption} hint="Optional. Shown in the full-screen viewer." maxLength={200} />
                        <label className="flex items-center justify-between gap-4">
                            <span>
                                <span className="block text-sm font-semibold">Published</span>
                                <span className="block text-xs text-muted">Visible on the Gallery page.</span>
                            </span>
                            <Switch checked={state.is_published} onChange={value => set("is_published", value)} label="Published" />
                        </label>
                    </div>
                </div>
            </Card>

            <SaveBar isNew={false} isDirty={form.isDirty} saving={form.saving} deleting={deleting} createLabel="Save" onDelete={handleDelete} viewHref="/gallery" />
        </form>
    )
}
