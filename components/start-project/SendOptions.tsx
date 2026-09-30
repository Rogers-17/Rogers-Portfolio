"use client"

import * as React from "react"
import { LuChevronLeft, LuMail, LuMessageCircle, LuPhone } from "react-icons/lu"
import type { Answers } from "@/components/start-project/ProjectWizard"
import type { ProjectFormSettings } from "@/lib/pages/schema"
import { buildChannelUrl, phoneSchema, type Channel } from "@/lib/project-request/schema"

export type SendResult = { channel: Channel, warning?: string }

type Props = {
    answers: Answers
    settings: ProjectFormSettings
    honeypot: string
    startedAt: () => number
    onSent: (result: SendResult) => void
    onBack: () => void
}

type ApiResponse = { ok: true } | { ok: false, error: { message: string } }

const card =
    "group flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/2 p-6 text-center transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-accent-1 hover:bg-white/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 disabled:pointer-events-none disabled:opacity-50"

const location = (answers: Answers) => (answers.locationChoice === "Other" ? answers.locationOther : answers.locationChoice)

function toRequest (answers: Answers) {
    return {
        name: answers.name.trim(),
        location: location(answers).trim(),
        project_type: answers.project_type,
        business_name: answers.business_name.trim(),
        is_flexible: answers.is_flexible,
        deadline_date: answers.is_flexible ? null : answers.deadline_date || null,
        deadline_time: answers.is_flexible ? null : answers.deadline_time || null,
        budget: answers.budget,
        details: answers.details.trim(),
    }
}

// Saves the request, then hands it off via WhatsApp, email, or a callback request.
// WhatsApp/email open immediately (inside the click, so popup blockers allow it) and the
// save runs alongside; if saving fails the visitor still has their message ready to send.
export default function SendOptions ({ answers, settings, honeypot, startedAt, onSent, onBack }: Props) {
    const [mode, setMode] = React.useState<"choose" | "callback">("choose")
    const [phone, setPhone] = React.useState("")
    const [error, setError] = React.useState<string | null>(null)
    const [busy, setBusy] = React.useState(false)
    const phoneRef = React.useRef<HTMLInputElement>(null)

    const request = toRequest(answers)

    React.useEffect(() => {
        if (mode === "callback") phoneRef.current?.focus()
    }, [mode])

    async function save (channel: Channel, visitorPhone: string | null): Promise<string | null> {
        try {
            const response = await fetch("/api/project-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...request, channel, visitor_phone: visitorPhone, website: honeypot, started_at: startedAt() }),
                keepalive: true,
            })
            const payload = (await response.json().catch(() => null)) as ApiResponse | null
            if (payload?.ok) return null
            return payload && !payload.ok ? payload.error.message : "Couldn't save your request."
        } catch {
            return "You seem to be offline."
        }
    }

    async function sendVia (channel: "whatsapp" | "email") {
        const target = channel === "whatsapp" ? settings.whatsapp_number : settings.contact_email
        if (!target) return
        const url = buildChannelUrl(channel, target, request)
        if (channel === "whatsapp") window.open(url, "_blank", "noopener,noreferrer")
        else window.location.assign(url)

        setBusy(true)
        const failure = await save(channel, null)
        setBusy(false)
        onSent({
            channel,
            warning: failure ? `${failure} Your message is still ready to send, so nothing is lost.` : undefined,
        })
    }

    async function requestCallback (event: React.SyntheticEvent) {
        event.preventDefault()
        const parsed = phoneSchema.safeParse(phone)
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number")
            return
        }
        setError(null)
        setBusy(true)
        const failure = await save("callback", parsed.data)
        setBusy(false)
        if (failure) {
            setError(failure)
            return
        }
        onSent({ channel: "callback" })
    }

    if (mode === "callback") {
        const smsUrl = settings.contact_phone
            ? buildChannelUrl("sms", settings.contact_phone, { ...request, visitor_phone: phone || null })
            : null
        return (
            <div className="mt-2">
                <label htmlFor="visitor-phone" className="text-sm font-semibold">Your phone number</label>
                <p className="mt-1 text-xs text-muted">Provide your details and I&apos;ll reach out to you.</p>
                <div className="mt-3 flex flex-col gap-3">
                    <input
                        ref={phoneRef}
                        id="visitor-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+234 801 234 5678"
                        maxLength={20}
                        value={phone}
                        onChange={event => {
                            setPhone(event.target.value)
                            setError(null)
                        }}
                        onKeyDown={event => {
                            if (event.key === "Enter") void requestCallback(event)
                        }}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "visitor-phone-error" : undefined}
                        className="w-full border-0 border-b border-white/15 bg-transparent px-0 py-3 text-lg text-fg placeholder:text-dim focus:border-accent-1 focus:outline-none aria-invalid:border-rose-500"
                    />
                    {error && <p id="visitor-phone-error" role="alert" className="text-sm text-rose-400">{error}</p>}
                </div>
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                    <button type="button" onClick={() => { setMode("choose"); setError(null) }} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 px-6 text-sm font-semibold text-fg/90 hover:border-white/30">
                        <LuChevronLeft className="size-4" aria-hidden="true" />
                        Back
                    </button>
                    <button type="button" onClick={requestCallback} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,14,255,0.3)] disabled:opacity-60">
                        {busy ? "Sending…" : "Request a call"}
                    </button>
                </div>
                {smsUrl && (
                    <p className="mt-6 text-center text-sm text-muted">
                        Prefer to text?{" "}
                        <a href={smsUrl} className="font-semibold text-accent-1 underline-offset-4 hover:underline">Text me now</a>
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="mt-2">
            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                {settings.whatsapp_number && (
                    <button type="button" className={card} onClick={() => sendVia("whatsapp")} disabled={busy}>
                        <LuMessageCircle className="size-6 text-fg/90 transition-colors group-hover:text-accent-1" aria-hidden="true" />
                        <span className="font-bold">Send via WhatsApp</span>
                        <span className="text-xs text-muted">Opens WhatsApp with your details pre-filled</span>
                    </button>
                )}
                {settings.contact_email && (
                    <button type="button" className={card} onClick={() => sendVia("email")} disabled={busy}>
                        <LuMail className="size-6 text-fg/90 transition-colors group-hover:text-accent-1" aria-hidden="true" />
                        <span className="font-bold">Send via Email</span>
                        <span className="text-xs text-muted">Opens your email client with a draft ready</span>
                    </button>
                )}
                <button type="button" className={card} onClick={() => setMode("callback")} disabled={busy}>
                    <LuPhone className="size-6 text-fg/90 transition-colors group-hover:text-accent-1" aria-hidden="true" />
                    <span className="font-bold">Call or text me instead</span>
                    <span className="text-xs text-muted">Provide your details and I&apos;ll reach out to you</span>
                </button>
            </div>
            <div className="mt-10">
                <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 px-6 text-sm font-semibold text-fg/90 hover:border-white/30">
                    <LuChevronLeft className="size-4" aria-hidden="true" />
                    Back
                </button>
            </div>
        </div>
    )
}
