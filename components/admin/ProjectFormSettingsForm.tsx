"use client"

import ChipsInput from "@/components/admin/ChipsInput"
import SaveBar from "@/components/admin/SaveBar"
import { Card, TextField, inputClass } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { COUNTRIES_MAX, OPTIONS_MAX, projectFormInputSchema } from "@/lib/admin/page-schemas"
import { STEP_KEYS, STEP_LABELS, type ProjectFormSettings, type StepCopy, type StepKey } from "@/lib/pages/schema"

type FormState = Omit<ProjectFormSettings, "whatsapp_number" | "contact_email" | "contact_phone"> & {
    whatsapp_number: string
    contact_email: string
    contact_phone: string
}

const toFormState = (settings: ProjectFormSettings): FormState => ({
    ...settings,
    whatsapp_number: settings.whatsapp_number ?? "",
    contact_email: settings.contact_email ?? "",
    contact_phone: settings.contact_phone ?? "",
})

const toPayload = (state: FormState) => state

export default function ProjectFormSettingsForm ({ settings }: { settings: ProjectFormSettings }) {
    const form = useSaveForm({ initial: toFormState(settings), toPayload, schema: projectFormInputSchema, endpoint: "/api/admin/project-form", successMessage: "Project form saved." })
    const { state, set, errors } = form

    const setStep = (key: StepKey, field: keyof StepCopy, value: string) =>
        form.setState(current => ({ ...current, steps: { ...current.steps, [key]: { ...current.steps[key], [field]: value } } }))

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <Card title="Where requests are sent" hint="Visitors choose one of these on the last screen. WhatsApp and Email cards only show when set; “Call or text me” always saves the request to Inquiries.">
                <div className="grid gap-5 md:grid-cols-3">
                    <TextField
                        label="WhatsApp number"
                        inputMode="tel"
                        value={state.whatsapp_number}
                        onChange={event => set("whatsapp_number", event.target.value)}
                        error={errors.whatsapp_number}
                        hint="With country code, digits only, e.g. 2348012345678."
                        maxLength={20}
                    />
                    <TextField label="Email" type="email" value={state.contact_email} onChange={event => set("contact_email", event.target.value)} error={errors.contact_email} hint="Opens the visitor's email app with a draft." maxLength={254} />
                    <TextField label="Phone (for texts)" inputMode="tel" value={state.contact_phone} onChange={event => set("contact_phone", event.target.value)} error={errors.contact_phone} hint="Optional. Adds a “Text me now” link." maxLength={20} />
                </div>
            </Card>

            <Card title="Answer options" hint="Shown as cards in the form. Type an option and press Enter.">
                <ChipsInput label={`Countries (max ${COUNTRIES_MAX}, “Other” is added automatically)`} values={state.countries} onChange={values => set("countries", values)} max={COUNTRIES_MAX} error={errors.countries} />
                <ChipsInput label={`Project types (max ${OPTIONS_MAX})`} values={state.project_types} onChange={values => set("project_types", values)} max={OPTIONS_MAX} error={errors.project_types} />
                <ChipsInput label={`Budgets (max ${OPTIONS_MAX})`} values={state.budgets} onChange={values => set("budgets", values)} max={OPTIONS_MAX} error={errors.budgets} />
            </Card>

            <Card title="Step texts" hint="Small line, question and helper text for each screen. Use {name} to insert the visitor's first name.">
                <div className="flex flex-col gap-5">
                    {STEP_KEYS.map(key => (
                        <fieldset key={key} className="grid gap-3 rounded-xl border border-white/6 p-4 md:grid-cols-[9rem_1fr_1.4fr_1.6fr] md:items-start md:gap-4">
                            <legend className="sr-only">{STEP_LABELS[key]}</legend>
                            <p className="text-sm font-semibold md:pt-2.5" aria-hidden="true">{STEP_LABELS[key]}</p>
                            {(["eyebrow", "title", "subtitle"] as const).map(field => {
                                const error = errors[`steps.${key}.${field}`]
                                return (
                                    <div key={field} className="flex flex-col gap-1">
                                        <input
                                            aria-label={`${STEP_LABELS[key]}: ${field === "eyebrow" ? "small line" : field === "title" ? "question" : "helper text"}`}
                                            placeholder={field === "eyebrow" ? "Small line" : field === "title" ? "Question" : "Helper text"}
                                            value={state.steps[key][field]}
                                            onChange={event => setStep(key, field, event.target.value)}
                                            maxLength={field === "eyebrow" ? 60 : field === "title" ? 100 : 200}
                                            aria-invalid={Boolean(error)}
                                            className={inputClass}
                                        />
                                        {error && <p className="text-xs text-rose-400">{error}</p>}
                                    </div>
                                )
                            })}
                        </fieldset>
                    ))}
                </div>
            </Card>

            <SaveBar isNew={false} isDirty={form.isDirty} saving={form.saving} createLabel="Save" viewHref="/start-a-project" />
        </form>
    )
}
