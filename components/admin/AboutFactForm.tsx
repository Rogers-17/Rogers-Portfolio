"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FACT_ICON_COMPONENTS, FACT_ICON_LABELS } from "@/components/about/fact-icons"
import SaveBar from "@/components/admin/SaveBar"
import { Card, SelectField, Switch, TextAreaField, TextField } from "@/components/admin/Field"
import { useDialog } from "@/components/admin/Dialog"
import { useScrollToFirstError, useUnsavedGuard, zodErrorsToRecord } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import type { AdminAboutFact } from "@/lib/admin/page-queries"
import { aboutFactInputSchema } from "@/lib/admin/page-schemas"
import { FACT_ICONS, type FactIcon } from "@/lib/pages/schema"

type FormState = { icon: FactIcon, title: string, body: string, is_published: boolean }

const toFormState = (fact?: AdminAboutFact): FormState => ({
    icon: fact?.icon ?? "calendar",
    title: fact?.title ?? "",
    body: fact?.body ?? "",
    is_published: fact?.is_published ?? true,
})

export default function AboutFactForm ({ fact }: { fact?: AdminAboutFact }) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const isNew = !fact

    const [state, setState] = React.useState(() => toFormState(fact))
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(state))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)

    const isDirty = JSON.stringify(state) !== savedSnapshot
    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))
    const Icon = FACT_ICON_COMPONENTS[state.icon]

    async function handleSave () {
        const parsed = aboutFactInputSchema.safeParse(state)
        if (!parsed.success) {
            setErrors(zodErrorsToRecord(parsed.error))
            notify("Fix the highlighted fields.", "error")
            return
        }
        setErrors({})
        setSaving(true)
        const result = await adminFetch<{ id: string }>(isNew ? "/api/admin/about-facts" : `/api/admin/about-facts/${fact.id}`, { json: parsed.data })
        setSaving(false)
        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(JSON.stringify(state))
        notify(isNew ? "Row created." : "Saved.")
        if (isNew) router.replace(`/admin/about/facts/${result.data.id}`)
        else router.refresh()
    }

    async function handleDelete () {
        if (!fact || !(await confirm({ title: `Delete “${fact.title}”?`, message: "The row is removed from the About page accordion.", confirmLabel: "Delete", tone: "danger" }))) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/about-facts/${fact.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(JSON.stringify(state))
        notify("Row deleted.")
        router.replace("/admin/about")
        router.refresh()
    }

    return (
        <form onSubmit={event => { event.preventDefault(); void handleSave() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/about" className="text-sm text-muted hover:text-white">← About page</Link>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">{isNew ? "New accordion row" : fact.title}</h1>
            </div>

            <Card title="Accordion row" hint="Shown next to “My Early Life” on the About page. One row is open at a time.">
                <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
                    <TextField label="Title" value={state.title} onChange={event => set("title", event.target.value)} error={errors.title} hint="e.g. Born (April 9)" maxLength={60} required />
                    <div className="flex items-end gap-3">
                        <SelectField label="Icon" value={state.icon} onChange={event => set("icon", event.target.value as FactIcon)} error={errors.icon} className="flex-1">
                            {FACT_ICONS.map(icon => <option key={icon} value={icon}>{FACT_ICON_LABELS[icon]}</option>)}
                        </SelectField>
                        <span className="mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 text-white" aria-hidden="true">
                            <Icon />
                        </span>
                    </div>
                </div>
                <TextAreaField
                    label="Text"
                    rows={5}
                    value={state.body}
                    onChange={event => set("body", event.target.value)}
                    error={errors.body}
                    hint={`${state.body.length}/2000 · Wrap words in **double asterisks** for bold.`}
                    maxLength={2000}
                    required
                />
            </Card>

            <Card title="Visibility">
                <label className="flex items-center justify-between gap-4">
                    <span>
                        <span className="block text-sm font-semibold">Published</span>
                        <span className="block text-xs text-muted">Visible on the About page.</span>
                    </span>
                    <Switch checked={state.is_published} onChange={value => set("is_published", value)} label="Published" />
                </label>
            </Card>

            <SaveBar isNew={isNew} isDirty={isDirty} saving={saving} deleting={deleting} createLabel="Create row" onDelete={handleDelete} viewHref="/about" />
        </form>
    )
}
