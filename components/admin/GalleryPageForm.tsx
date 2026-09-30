"use client"

import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, TextAreaField, TextField } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { galleryPageInputSchema } from "@/lib/admin/page-schemas"
import type { GalleryContent } from "@/lib/pages/schema"

type FormState = Omit<GalleryContent, "heroUrl" | "signature"> & { signature: string, hero_url: string | null }

const toFormState = ({ heroUrl, signature, ...rest }: GalleryContent): FormState => ({ ...rest, signature: signature ?? "", hero_url: heroUrl })
const toPayload = (state: FormState) => {
    const payload: Partial<FormState> = { ...state }
    delete payload.hero_url
    return payload
}

export default function GalleryPageForm ({ page }: { page: GalleryContent }) {
    const form = useSaveForm({ initial: toFormState(page), toPayload, schema: galleryPageInputSchema, endpoint: "/api/admin/gallery", successMessage: "Gallery page saved." })
    const { state, set, errors } = form

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <Card title="Hero" hint="Text on the left and the torn-edge photo on the right.">
                <div className="grid gap-5 md:grid-cols-3">
                    <TextField label="Badge" value={state.badge} onChange={event => set("badge", event.target.value)} error={errors.badge} hint="e.g. Gallery 🖼️" maxLength={40} />
                    <TextField label="Title (white)" value={state.title} onChange={event => set("title", event.target.value)} error={errors.title} maxLength={80} />
                    <TextField label="Highlight (gradient)" value={state.highlight} onChange={event => set("highlight", event.target.value)} error={errors.highlight} maxLength={80} />
                </div>
                <TextAreaField
                    label="Quote"
                    rows={6}
                    value={state.quote}
                    onChange={event => set("quote", event.target.value)}
                    error={errors.quote}
                    hint="Leave a blank line between paragraphs."
                    maxLength={2000}
                />
                <TextField label="Signature" value={state.signature} onChange={event => set("signature", event.target.value)} error={errors.signature} hint="Shown as “— Rogers”. Leave empty to hide." maxLength={60} className="md:max-w-xs" />
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-fg/90">Hero photo (landscape)</span>
                        <ImageUpload
                            bucket="site-images"
                            folder="gallery"
                            resize={1800}
                            path={state.hero_path}
                            url={state.hero_url}
                            onChange={value => form.setState(current => ({ ...current, hero_path: value?.path ?? null, hero_url: value?.url ?? null }))}
                            aspectClass="aspect-4/3"
                            error={errors.hero_path}
                        />
                    </div>
                    <div>
                        <TextField label="Hero photo description (alt text)" value={state.hero_alt} onChange={event => set("hero_alt", event.target.value)} error={errors.hero_alt} maxLength={200} />
                    </div>
                </div>
            </Card>

            <Card title="Call to action">
                <div className="grid gap-5 md:grid-cols-2">
                    <TextField label="Title" value={state.cta_title} onChange={event => set("cta_title", event.target.value)} error={errors.cta_title} maxLength={80} />
                    <TextField label="Link text" value={state.cta_label} onChange={event => set("cta_label", event.target.value)} error={errors.cta_label} maxLength={40} />
                </div>
            </Card>

            <SaveBar isNew={false} isDirty={form.isDirty} saving={form.saving} createLabel="Save" viewHref="/gallery" />
        </form>
    )
}
