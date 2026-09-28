"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { QUOTE_MAX, testimonialInputSchema } from "@/lib/admin/content-schemas"
import type { AdminTestimonial } from "@/lib/admin/content-queries"
import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, SelectField, Switch, TextAreaField, TextField } from "@/components/admin/Field"
import { useScrollToFirstError, useUnsavedGuard, zodErrorsToRecord } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"

type FormState = {
    quote: string
    author_name: string
    author_role: string
    rating: string
    avatar_path: string | null
    avatar_url: string | null
    is_published: boolean
}

function toFormState (testimonial?: AdminTestimonial): FormState {
    return {
        quote: testimonial?.quote ?? "",
        author_name: testimonial?.author_name ?? "",
        author_role: testimonial?.author_role ?? "",
        rating: testimonial?.rating ? String(testimonial.rating) : "",
        avatar_path: testimonial?.avatar_path ?? null,
        avatar_url: testimonial?.avatarUrl ?? null,
        is_published: testimonial?.is_published ?? true,
    }
}

const toPayload = (state: FormState) => ({
    quote: state.quote,
    author_name: state.author_name,
    author_role: state.author_role,
    rating: state.rating ? Number(state.rating) : null,
    avatar_path: state.avatar_path,
    is_published: state.is_published,
})

export default function TestimonialForm ({ testimonial }: { testimonial?: AdminTestimonial }) {
    const router = useRouter()
    const { notify } = useToast()
    const isNew = !testimonial

    const [state, setState] = React.useState(() => toFormState(testimonial))
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(toPayload(state)))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)

    const isDirty = JSON.stringify(toPayload(state)) !== savedSnapshot
    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))

    async function handleSave () {
        const parsed = testimonialInputSchema.safeParse(toPayload(state))
        if (!parsed.success) {
            setErrors(zodErrorsToRecord(parsed.error))
            notify("Fix the highlighted fields.", "error")
            return
        }

        setErrors({})
        setSaving(true)
        const result = await adminFetch<{ id: string }>(
            isNew ? "/api/admin/testimonials" : `/api/admin/testimonials/${testimonial.id}`,
            { json: parsed.data },
        )
        setSaving(false)

        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            notify(result.error.message, "error")
            return
        }

        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify(isNew ? "Testimonial created." : "Saved.")
        if (isNew) router.replace(`/admin/testimonials/${result.data.id}`)
        else router.refresh()
    }

    async function handleDelete () {
        if (!testimonial || !window.confirm(`Delete the testimonial from "${testimonial.author_name}"? This can't be undone.`)) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/testimonials/${testimonial.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify("Testimonial deleted.")
        router.replace("/admin/testimonials")
        router.refresh()
    }

    return (
        <form onSubmit={event => { event.preventDefault(); void handleSave() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/testimonials" className="text-sm text-muted hover:text-white">← All testimonials</Link>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">{isNew ? "New testimonial" : testimonial.author_name}</h1>
            </div>

            <Card title="Testimonial" hint="Shown in the homepage Testimonials section.">
                <TextAreaField
                    label="Quote"
                    rows={5}
                    value={state.quote}
                    onChange={event => set("quote", event.target.value)}
                    error={errors.quote}
                    hint={`${state.quote.length}/${QUOTE_MAX}`}
                    maxLength={QUOTE_MAX}
                    required
                />
                <div className="grid gap-5 md:grid-cols-2">
                    <TextField label="Author name" value={state.author_name} onChange={event => set("author_name", event.target.value)} error={errors.author_name} maxLength={80} required />
                    <TextField label="Role & company" value={state.author_role} onChange={event => set("author_role", event.target.value)} error={errors.author_role} hint="e.g. CEO, Lendify" maxLength={120} />
                </div>
                <SelectField label="Rating" value={state.rating} onChange={event => set("rating", event.target.value)} error={errors.rating} hint="Stars shown on the card (optional)." className="md:max-w-xs">
                    <option value="">None</option>
                    {[5, 4, 3, 2, 1].map(stars => <option key={stars} value={stars}>{stars} star{stars === 1 ? "" : "s"}</option>)}
                </SelectField>
            </Card>

            <Card title="Avatar" hint="Square photo, PNG/JPG/WEBP/AVIF up to 2 MB. Without one, initials are shown.">
                <div className="w-full max-w-40">
                    <ImageUpload
                        bucket="site-images"
                        folder="avatars"
                        path={state.avatar_path}
                        url={state.avatar_url}
                        onChange={value => setState(current => ({ ...current, avatar_path: value?.path ?? null, avatar_url: value?.url ?? null }))}
                        label="Upload avatar"
                        aspectClass="aspect-square"
                        error={errors.avatar_path}
                    />
                </div>
            </Card>

            <Card title="Visibility">
                <label className="flex items-center justify-between gap-4">
                    <span>
                        <span className="block text-sm font-semibold">Published</span>
                        <span className="block text-xs text-muted">Visible on the homepage.</span>
                    </span>
                    <Switch checked={state.is_published} onChange={value => set("is_published", value)} label="Published" />
                </label>
            </Card>

            <SaveBar isNew={isNew} isDirty={isDirty} saving={saving} deleting={deleting} createLabel="Create testimonial" onDelete={handleDelete} />
        </form>
    )
}
