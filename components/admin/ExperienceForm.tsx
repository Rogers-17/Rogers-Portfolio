"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { adminFetch, issuesToRecord } from "@/lib/admin/client"
import { SKILLS_MAX, experienceInputSchema } from "@/lib/admin/content-schemas"
import type { AdminExperience } from "@/lib/admin/content-queries"
import { MONTHS, formatDuration, formatPeriod } from "@/lib/content/schema"
import ChipsInput from "@/components/admin/ChipsInput"
import ImageUpload from "@/components/admin/ImageUpload"
import SaveBar from "@/components/admin/SaveBar"
import { Card, SelectField, Switch, TextAreaField, TextField } from "@/components/admin/Field"
import { useScrollToFirstError, useUnsavedGuard, zodErrorsToRecord } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"

type FormState = {
    role: string
    company: string
    company_url: string
    location: string
    start_year: string
    start_month: string
    end_year: string
    end_month: string
    is_current: boolean
    description: string
    skills: string[]
    logo_path: string | null
    logo_url: string | null
    is_published: boolean
}

function toFormState (experience?: AdminExperience): FormState {
    return {
        role: experience?.role ?? "",
        company: experience?.company ?? "",
        company_url: experience?.company_url ?? "",
        location: experience?.location ?? "",
        start_year: experience ? String(experience.start_year) : "",
        start_month: experience?.start_month ? String(experience.start_month) : "",
        end_year: experience?.end_year ? String(experience.end_year) : "",
        end_month: experience?.end_month ? String(experience.end_month) : "",
        is_current: experience?.is_current ?? false,
        description: experience?.description ?? "",
        skills: experience?.skills ?? [],
        logo_path: experience?.logo_path ?? null,
        logo_url: experience?.logoUrl ?? null,
        is_published: experience?.is_published ?? true,
    }
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value))

const toPayload = (state: FormState) => ({
    role: state.role,
    company: state.company,
    company_url: state.company_url,
    location: state.location,
    start_year: state.start_year.trim() === "" ? undefined : Number(state.start_year),
    start_month: numberOrNull(state.start_month),
    end_year: state.is_current ? null : numberOrNull(state.end_year),
    end_month: state.is_current ? null : numberOrNull(state.end_month),
    is_current: state.is_current,
    description: state.description,
    skills: state.skills,
    logo_path: state.logo_path,
    is_published: state.is_published,
})

function MonthSelect ({ label, value, onChange, error }: { label: string, value: string, onChange: (value: string) => void, error?: string }) {
    return (
        <SelectField label={label} value={value} onChange={event => onChange(event.target.value)} error={error}>
            <option value="">—</option>
            {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </SelectField>
    )
}

export default function ExperienceForm ({ experience }: { experience?: AdminExperience }) {
    const router = useRouter()
    const { notify } = useToast()
    const isNew = !experience

    const [state, setState] = React.useState(() => toFormState(experience))
    const [savedSnapshot, setSavedSnapshot] = React.useState(() => JSON.stringify(toPayload(state)))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)

    const isDirty = JSON.stringify(toPayload(state)) !== savedSnapshot
    useUnsavedGuard(isDirty)
    useScrollToFirstError(errors)

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))

    // Live preview of how the dates will read on the site.
    const preview = React.useMemo(() => {
        const payload = toPayload(state)
        if (!payload.start_year) return null
        const dates = {
            start_year: payload.start_year,
            start_month: payload.start_month,
            end_year: payload.end_year,
            end_month: payload.end_month,
            is_current: payload.is_current,
        }
        const duration = formatDuration(dates)
        return `${formatPeriod(dates)}${duration ? ` · ${duration}` : ""}`
    }, [state])

    async function handleSave () {
        const parsed = experienceInputSchema.safeParse(toPayload(state))
        if (!parsed.success) {
            setErrors(zodErrorsToRecord(parsed.error))
            notify("Fix the highlighted fields.", "error")
            return
        }

        setErrors({})
        setSaving(true)
        const result = await adminFetch<{ id: string }>(
            isNew ? "/api/admin/experiences" : `/api/admin/experiences/${experience.id}`,
            { json: parsed.data },
        )
        setSaving(false)

        if (!result.ok) {
            setErrors(issuesToRecord(result.error.issues))
            notify(result.error.message, "error")
            return
        }

        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify(isNew ? "Experience created." : "Saved.")
        if (isNew) router.replace(`/admin/experience/${result.data.id}`)
        else router.refresh()
    }

    async function handleDelete () {
        if (!experience || !window.confirm(`Delete "${experience.role} at ${experience.company}"? This can't be undone.`)) return
        setDeleting(true)
        const result = await adminFetch(`/api/admin/experiences/${experience.id}/delete`, { method: "POST" })
        setDeleting(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSavedSnapshot(JSON.stringify(toPayload(state)))
        notify("Experience deleted.")
        router.replace("/admin/experience")
        router.refresh()
    }

    return (
        <form onSubmit={event => { event.preventDefault(); void handleSave() }} noValidate className="flex flex-col gap-6">
            <div>
                <Link href="/admin/experience" className="text-sm text-muted hover:text-white">← All experience</Link>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">{isNew ? "New experience" : `${experience.role}`}</h1>
                {!isNew && <p className="mt-1 text-sm text-muted">{experience.company}</p>}
            </div>

            <Card title="Role" hint="Shown in the homepage Experience timeline.">
                <div className="grid gap-5 md:grid-cols-2">
                    <TextField label="Role / title" value={state.role} onChange={event => set("role", event.target.value)} error={errors.role} maxLength={120} required />
                    <TextField label="Company" value={state.company} onChange={event => set("company", event.target.value)} error={errors.company} maxLength={120} required />
                    <TextField label="Company website" type="url" placeholder="https://" value={state.company_url} onChange={event => set("company_url", event.target.value)} error={errors.company_url} hint="Makes the company name a link (optional)." />
                    <TextField label="Location" value={state.location} onChange={event => set("location", event.target.value)} error={errors.location} hint="e.g. Victoria Island, Lagos" maxLength={120} />
                </div>
            </Card>

            <Card title="Dates" hint="Months are optional. Add them to show a duration like “3 yrs 7 mos”.">
                <div className="grid gap-5 sm:grid-cols-2">
                    <MonthSelect label="Start month" value={state.start_month} onChange={value => set("start_month", value)} error={errors.start_month} />
                    <TextField label="Start year" type="number" inputMode="numeric" min={1970} max={2100} value={state.start_year} onChange={event => set("start_year", event.target.value)} error={errors.start_year} required />
                </div>

                <label className="flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-white/2 px-4 py-3">
                    <span className="text-sm font-semibold">I currently work here</span>
                    <Switch checked={state.is_current} onChange={value => set("is_current", value)} label="I currently work here" />
                </label>

                {!state.is_current && (
                    <div className="grid gap-5 sm:grid-cols-2">
                        <MonthSelect label="End month" value={state.end_month} onChange={value => set("end_month", value)} error={errors.end_month} />
                        <TextField label="End year" type="number" inputMode="numeric" min={1970} max={2100} value={state.end_year} onChange={event => set("end_year", event.target.value)} error={errors.end_year} required />
                    </div>
                )}

                {preview && <p className="text-sm text-muted">On the site: <span className="font-semibold text-fg">{preview}</span></p>}
            </Card>

            <Card title="Details">
                <TextAreaField label="Description" rows={4} value={state.description} onChange={event => set("description", event.target.value)} error={errors.description} hint={`${state.description.length}/2000`} maxLength={2000} />
                <ChipsInput
                    label="Skills"
                    values={state.skills}
                    onChange={values => set("skills", values)}
                    max={SKILLS_MAX}
                    error={errors.skills ?? Object.entries(errors).find(([key]) => key.startsWith("skills."))?.[1]}
                    hint={`Press Enter or comma to add · ${state.skills.length}/${SKILLS_MAX}`}
                />
            </Card>

            <Card title="Company logo" hint="Square image, PNG/JPG/WEBP/AVIF up to 10 MB (optional).">
                <div className="w-full max-w-40">
                    <ImageUpload
                        bucket="site-images"
                        folder="logos"
                        path={state.logo_path}
                        url={state.logo_url}
                        onChange={value => setState(current => ({ ...current, logo_path: value?.path ?? null, logo_url: value?.url ?? null }))}
                        label="Upload logo"
                        aspectClass="aspect-square"
                        error={errors.logo_path}
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

            <SaveBar isNew={isNew} isDirty={isDirty} saving={saving} deleting={deleting} createLabel="Create experience" onDelete={handleDelete} />
        </form>
    )
}
