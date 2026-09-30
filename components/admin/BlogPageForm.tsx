"use client"

import { Card, TextAreaField, TextField, primaryButtonClass } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { blogPageInputSchema } from "@/lib/admin/blog-schemas"
import type { BlogPageRow } from "@/lib/blog/schema"

type FormState = Omit<BlogPageRow, "substack_url"> & { substack_url: string }

const toPayload = (state: FormState) => state

// Compact settings card for the /blog header (no sticky SaveBar: it sits above the post list).
export default function BlogPageForm ({ page }: { page: BlogPageRow }) {
    const form = useSaveForm<FormState>({
        initial: { ...page, substack_url: page.substack_url ?? "" },
        toPayload,
        schema: blogPageInputSchema,
        endpoint: "/api/admin/blog",
        successMessage: "Blog page saved.",
    })
    const { state, set, errors } = form

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate>
            <Card
                title="Blog page"
                hint="The heading and intro at the top of /blog."
                action={(
                    <button type="submit" disabled={form.saving || !form.isDirty} className={primaryButtonClass}>
                        {form.saving ? "Saving…" : form.isDirty ? "Save page" : "Saved"}
                    </button>
                )}
            >
                <div className="grid gap-5 md:grid-cols-3">
                    <TextField label="Badge" value={state.badge} onChange={event => set("badge", event.target.value)} error={errors.badge} maxLength={40} />
                    <TextField label="Title (white)" value={state.title} onChange={event => set("title", event.target.value)} error={errors.title} maxLength={80} />
                    <TextField label="Highlight (gradient)" value={state.highlight} onChange={event => set("highlight", event.target.value)} error={errors.highlight} maxLength={80} />
                </div>
                <TextAreaField label="Intro" rows={3} value={state.intro} onChange={event => set("intro", event.target.value)} error={errors.intro} hint={`${state.intro.length}/600`} maxLength={600} />
                <div className="grid gap-5 md:grid-cols-3">
                    <TextField label="Substack URL" type="url" placeholder="https://yourname.substack.com" value={state.substack_url} onChange={event => set("substack_url", event.target.value)} error={errors.substack_url} hint="Shows “Follow me on Substack”. Leave empty to hide." maxLength={300} />
                    <TextField label="CTA title" value={state.cta_title} onChange={event => set("cta_title", event.target.value)} error={errors.cta_title} maxLength={80} />
                    <TextField label="CTA link text" value={state.cta_label} onChange={event => set("cta_label", event.target.value)} error={errors.cta_label} maxLength={40} />
                </div>
            </Card>
        </form>
    )
}
