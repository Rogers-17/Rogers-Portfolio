"use client"

import { Card, SelectField, TextField, primaryButtonClass } from "@/components/admin/Field"
import { useSaveForm } from "@/components/admin/useSaveForm"
import { TEMPLATES, TEMPLATE_INFO, type TemplateKey } from "@/lib/resume/schema"
import { z } from "zod"

const schema = z.object({
    ai_model: z.string().trim().max(100).regex(/^[a-z0-9._-]+\/[a-z0-9._:-]+$/, "Use an OpenRouter model ID like anthropic/claude-haiku-4.5"),
    daily_ai_limit: z.number({ error: "Enter a number" }).int().min(1, "At least 1").max(2000, "Max 2000"),
    default_template: z.enum(TEMPLATES),
})

type State = { ai_model: string, daily_ai_limit: string, default_template: TemplateKey }
const toPayload = (state: State) => ({ ...state, daily_ai_limit: Number(state.daily_ai_limit) })

type Usage = { used: number, limit: number, model: string }
type Stats = { requests: number, tokens: number, cost: number }

export default function ResumeSettingsForm ({ settings, usage, month }: { settings: { ai_model: string, daily_ai_limit: number, default_template: TemplateKey }, usage: Usage, month: Stats }) {
    const form = useSaveForm<State>({
        initial: { ...settings, daily_ai_limit: String(settings.daily_ai_limit) },
        toPayload,
        schema,
        endpoint: "/api/admin/resume-settings",
        successMessage: "Settings saved.",
    })
    const { state, set, errors } = form

    return (
        <form onSubmit={event => { event.preventDefault(); void form.save() }} noValidate className="flex flex-col gap-6">
            <Card title="AI" hint="Requests go to OpenRouter with the key in OPEN_ROUTER_API_KEY (server-only)." action={<button type="submit" disabled={form.saving || !form.isDirty} className={primaryButtonClass}>{form.saving ? "Saving…" : "Save"}</button>}>
                <div className="grid gap-5 md:grid-cols-2">
                    <TextField label="Model" value={state.ai_model} onChange={event => set("ai_model", event.target.value)} error={errors.ai_model} hint="Any OpenRouter model ID, e.g. anthropic/claude-haiku-4.5, google/gemini-2.5-flash." maxLength={100} />
                    <TextField label="Daily request limit" inputMode="numeric" value={state.daily_ai_limit} onChange={event => set("daily_ai_limit", event.target.value.replace(/\D/g, ""))} error={errors.daily_ai_limit} hint="Protects your credits. Resets at midnight UTC." />
                </div>
                <SelectField label="Default template for new resumes" value={state.default_template} onChange={event => set("default_template", event.target.value as TemplateKey)} className="md:max-w-xs">
                    {TEMPLATES.map(template => <option key={template} value={template}>{TEMPLATE_INFO[template].label}</option>)}
                </SelectField>
            </Card>

            <Card title="Usage">
                <dl className="grid gap-4 sm:grid-cols-4">
                    {[
                        ["Today", `${usage.used} / ${usage.limit}`],
                        ["Last 30 days", `${month.requests} requests`],
                        ["Tokens (30 days)", month.tokens.toLocaleString("en-US")],
                        ["Cost (30 days)", month.cost ? `$${month.cost.toFixed(4)}` : "—"],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/6 bg-white/2 p-4">
                            <dt className="text-xs text-muted">{label}</dt>
                            <dd className="mt-1 text-lg font-bold">{value}</dd>
                        </div>
                    ))}
                </dl>
            </Card>
        </form>
    )
}
