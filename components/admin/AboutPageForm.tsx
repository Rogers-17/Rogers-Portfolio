"use client"

import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, TextAreaField, TextField } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { aboutPageInputSchema } from "@/lib/admin/page-schemas"
import type { AboutContent } from "@/lib/pages/schema"

type ImageSlot = "photo_primary" | "photo_secondary" | "background" | "journey_image"

type FormState = Omit<AboutContent, "photoPrimaryUrl" | "photoSecondaryUrl" | "backgroundUrl" | "journeyImageUrl"> & {
    urls: Record<ImageSlot, string | null>
}

const toFormState = (page: AboutContent): FormState => {
    const { photoPrimaryUrl, photoSecondaryUrl, backgroundUrl, journeyImageUrl, ...rest } = page
    return { ...rest, urls: { photo_primary: photoPrimaryUrl, photo_secondary: photoSecondaryUrl, background: backgroundUrl, journey_image: journeyImageUrl } }
}

const toPayload = (state: FormState) => {
    const payload: Partial<FormState> = { ...state }
    delete payload.urls
    return payload
}

const PARAGRAPH_HINT = "Leave a blank line between paragraphs. Wrap words in **double asterisks** for bold."

export default function AboutPageForm ({ page }: { page: AboutContent }) {
    const form = useSaveForm({ initial: toFormState(page), toPayload, schema: aboutPageInputSchema, endpoint: "/api/admin/about", successMessage: "About page saved." })
    const { state, set, errors } = form

    const text = (key: keyof FormState & string, label: string, max: number, hint?: string) => (
        <TextField label={label} value={String(state[key] ?? "")} onChange={event => set(key, event.target.value as never)} error={errors[key]} hint={hint} maxLength={max} />
    )

    const image = (slot: ImageSlot, label: string, aspectClass: string, resize: number) => (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg/90">{label}</span>
            <ImageUpload
                bucket="site-images"
                folder="about"
                resize={resize}
                path={state[`${slot}_path`]}
                url={state.urls[slot]}
                onChange={value => form.setState(current => ({ ...current, [`${slot}_path`]: value?.path ?? null, urls: { ...current.urls, [slot]: value?.url ?? null } }))}
                label="Upload image"
                aspectClass={aspectClass}
                error={errors[`${slot}_path`]}
            />
        </div>
    )

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <Card title="Hero" hint="The top of the About page.">
                <div className="grid gap-5 md:grid-cols-3">
                    {text("badge", "Badge", 40, "e.g. About Me 😍")}
                    {text("title", "Title (white)", 80)}
                    {text("highlight", "Highlight (gradient)", 80)}
                </div>
                <TextAreaField label="Intro" rows={8} value={state.intro} onChange={event => set("intro", event.target.value)} error={errors.intro} hint={PARAGRAPH_HINT} maxLength={4000} />
                <div className="grid gap-5 sm:grid-cols-2">
                    {image("photo_primary", "Photo 1 (back, tilted left)", "aspect-7/6", 1600)}
                    {image("photo_secondary", "Photo 2 (front, tilted right)", "aspect-12/11", 1600)}
                </div>
                {text("photo_alt", "Photo description (alt text)", 200, "Describes the photos for screen readers.")}
            </Card>

            <Card title="Background" hint="The fixed background that shows between the hero and “Early life” while the page scrolls. Without an image, an animated-looking code screen is shown.">
                <div className="w-full max-w-xl">{image("background", "Background image (landscape)", "aspect-16/9", 2400)}</div>
            </Card>

            <Card title="Early life" hint="Text next to the accordion. Manage the accordion rows below.">
                <div className="grid gap-5 md:grid-cols-2">
                    {text("early_eyebrow", "Heading (gradient)", 60)}
                    {text("early_title", "Sub-heading", 60)}
                </div>
                <TextAreaField label="Text" rows={10} value={state.early_body} onChange={event => set("early_body", event.target.value)} error={errors.early_body} hint={PARAGRAPH_HINT} maxLength={6000} />
            </Card>

            <Card title="The journey" hint="The section with the illustration on the left.">
                <div className="grid gap-5 md:grid-cols-2">
                    {text("journey_eyebrow", "Heading (gradient)", 60)}
                    {text("journey_title", "Sub-heading", 60)}
                </div>
                <TextAreaField label="Text" rows={10} value={state.journey_body} onChange={event => set("journey_body", event.target.value)} error={errors.journey_body} hint={PARAGRAPH_HINT} maxLength={6000} />
                <div className="grid gap-5 sm:grid-cols-2">
                    {image("journey_image", "Illustration (transparent PNG/WebP works best)", "aspect-4/5", 1600)}
                    <div className="flex flex-col gap-5">{text("journey_image_alt", "Illustration description (alt text)", 200)}</div>
                </div>
            </Card>

            <Card title="Call to action" hint="The closing line that links to Start A Project.">
                <div className="grid gap-5 md:grid-cols-2">
                    {text("cta_title", "Title", 80)}
                    {text("cta_label", "Link text", 40)}
                </div>
            </Card>

            <SaveBar isNew={false} isDirty={form.isDirty} saving={form.saving} createLabel="Save" viewHref="/about" />
        </form>
    )
}
