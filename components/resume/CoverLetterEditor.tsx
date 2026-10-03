"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuLoaderCircle, LuSave, LuSparkles, LuTrash2, LuUserRound } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { inputClass } from "@/components/admin/Field"
import { useUnsavedGuard } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"
import { RField, RTextArea, ghostButton, labelClass } from "@/components/resume/controls"
import { PdfViewer } from "@/components/resume/PdfPreview"
import { useContainerWidth } from "@/components/resume/useContainerWidth"
import { adminFetch } from "@/lib/admin/client"
import { COVER_STYLES, COVER_TONES, DEFAULT_CLOSING, DEFAULT_SALUTATION, coverLetterInputSchema, defaultSubject, type CoverStyle } from "@/lib/resume/cover-letter"
import { resumeToText } from "@/lib/resume/normalize"
import type { CoverLetterRecord } from "@/lib/resume/queries"
import { blankResume, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

export type LinkableResume = { id: string, title: string, template: TemplateKey, design: ResumeDesign, data: ResumeData, job_description: string | null, job_company: string | null, target_role: string | null }

type FormState = {
    resume_id: string | null
    title: string
    company: string
    job_title: string
    sender_name: string
    sender_contact: string
    sender_address: string
    recipient: string
    letter_date: string
    salutation: string
    subject: string
    body: string
    closing: string
    style: CoverStyle
}

const toState = (letter: CoverLetterRecord): FormState => ({
    resume_id: letter.resume_id,
    title: letter.title,
    company: letter.company ?? "",
    job_title: letter.job_title ?? "",
    sender_name: letter.sender_name ?? "",
    sender_contact: letter.sender_contact ?? "",
    sender_address: letter.sender_address ?? "",
    recipient: letter.recipient ?? "",
    letter_date: letter.letter_date ?? "",
    salutation: letter.salutation ?? "",
    subject: letter.subject ?? "",
    body: letter.body,
    closing: letter.closing ?? "",
    style: letter.style,
})

// The sender block as it appears on the resume: phone and email on separate lines.
function senderFromResume (resume: LinkableResume | null) {
    const contact = resume?.data.contact
    return {
        sender_name: contact?.fullName.trim() ?? "",
        sender_contact: [contact?.phone.trim(), contact?.email.trim()].filter(Boolean).join("\n"),
        sender_address: contact?.location.trim() ?? "",
    }
}

const STYLE_INFO: Record<CoverStyle, { label: string, hint: string }> = {
    formal: { label: "Formal", hint: "Times, plain white page" },
    resume: { label: "Match resume", hint: "Your resume's header and colours" },
}

// One titled group of the form, in the order it appears on the letter.
function Group ({ step, title, hint, action, children }: { step: number, title: string, hint?: string, action?: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="border-t border-white/6 pt-5 first:border-t-0 first:pt-0">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-1/12 text-[11px] font-bold text-accent-1" aria-hidden="true">{step}</span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold">{title}</h2>
                        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="grid gap-4 @xl:grid-cols-2">{children}</div>
        </section>
    )
}

export default function CoverLetterEditor ({ letter, resumes }: { letter: CoverLetterRecord, resumes: LinkableResume[] }) {
    const router = useRouter()
    const { notify } = useToast()
    const { confirm } = useDialog()
    const [state, setState] = React.useState(() => toState(letter))
    const [saved, setSaved] = React.useState(() => JSON.stringify(toState(letter)))
    const [saving, setSaving] = React.useState(false)
    const [tone, setTone] = React.useState<(typeof COVER_TONES)[number]>("professional")
    const [notes, setNotes] = React.useState("")
    const [jobDescription, setJobDescription] = React.useState(() => resumes.find(resume => resume.id === letter.resume_id)?.job_description ?? "")
    const [generating, setGenerating] = React.useState(false)
    const [layoutRef, layoutWidth] = useContainerWidth<HTMLDivElement>()
    const sideBySide = layoutWidth >= 1000

    const dirty = JSON.stringify(state) !== saved
    useUnsavedGuard(dirty)
    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))
    const resume = resumes.find(entry => entry.id === state.resume_id) ?? null

    // Linking a resume fills the sender block only where it's still empty.
    function linkResume (id: string | null) {
        const next = resumes.find(entry => entry.id === id) ?? null
        const sender = senderFromResume(next)
        setState(current => ({
            ...current,
            resume_id: id,
            sender_name: current.sender_name || sender.sender_name,
            sender_contact: current.sender_contact || sender.sender_contact,
            sender_address: current.sender_address || sender.sender_address,
        }))
        setJobDescription(next?.job_description ?? jobDescription)
    }

    async function applyResumeDetails () {
        const hasText = state.sender_name || state.sender_contact || state.sender_address
        if (hasText && !(await confirm({ title: "Replace your details?", message: "Your name, contact lines and address are replaced with the ones from the linked resume.", confirmLabel: "Replace", tone: "warning" }))) return
        setState(current => ({ ...current, ...senderFromResume(resume) }))
    }

    async function save () {
        const parsed = coverLetterInputSchema.safeParse(state)
        if (!parsed.success) {
            notify(parsed.error.issues[0]?.message ?? "Check the fields.", "error")
            return
        }
        setSaving(true)
        const result = await adminFetch(`/api/admin/cover-letters/${letter.id}`, { json: parsed.data })
        setSaving(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSaved(JSON.stringify(state))
        notify("Cover letter saved.")
    }

    async function remove () {
        if (!(await confirm({ title: `Delete “${state.title || "this cover letter"}”?`, message: "The letter is deleted permanently.", confirmLabel: "Delete", tone: "danger" }))) return
        const result = await adminFetch(`/api/admin/cover-letters/${letter.id}/delete`, { method: "POST" })
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        setSaved(JSON.stringify(state))
        router.replace("/admin/cover-letters")
        router.refresh()
    }

    async function generate () {
        if (!resume) return
        if (state.body.trim() && !(await confirm({ title: "Replace your letter?", message: "A new AI draft replaces the current text. Save first if you want to keep a copy.", confirmLabel: "Replace with new draft", tone: "warning" }))) return
        setGenerating(true)
        const result = await adminFetch<{ body: string }>("/api/admin/ai/cover-letter", {
            json: { resume: resumeToText(resume.data), company: state.company, jobTitle: state.job_title || resume.target_role || "", recipient: state.recipient, jobDescription, tone, notes },
        })
        setGenerating(false)
        if (!result.ok) {
            notify(result.error.message, "error")
            return
        }
        set("body", result.data.body)
    }

    const contact = resume?.data.contact ?? blankResume().contact
    const documentProps = {
        contact,
        template: resume?.template ?? "professional" as TemplateKey,
        design: resume?.design ?? { accent: null, density: "normal" as const, paper: "A4" as const, showPhoto: false },
        style: state.style,
        title: state.title,
        senderName: state.sender_name,
        senderContact: state.sender_contact,
        senderAddress: state.sender_address,
        recipient: state.recipient,
        company: state.company,
        jobTitle: state.job_title,
        date: state.letter_date,
        salutation: state.salutation,
        subject: state.subject,
        body: state.body,
        closing: state.closing,
    }
    const autoSubject = defaultSubject(state.job_title)

    return (
        <div ref={layoutRef} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <nav aria-label="Breadcrumb" className="text-[11px] font-semibold tracking-[0.2em] text-dim uppercase">
                        <Link href="/admin" className="hover:text-white">Dashboard</Link><span className="mx-2">/</span>
                        <Link href="/admin/cover-letters" className="hover:text-white">Cover letters</Link><span className="mx-2">/</span>
                        <span className="text-fg">Editor</span>
                    </nav>
                    <h1 className="mt-1 truncate text-xl font-bold md:text-2xl">{state.title || "Cover letter"}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-muted sm:inline" aria-live="polite">{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
                    <button type="button" onClick={remove} aria-label="Delete cover letter" className="inline-flex size-10 items-center justify-center rounded-full text-rose-300 hover:bg-rose-500/10"><LuTrash2 aria-hidden="true" /></button>
                    <button type="button" onClick={save} disabled={saving || !dirty} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50">
                        {saving ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSave aria-hidden="true" />} Save
                    </button>
                </div>
            </div>

            <div className={`grid items-start gap-5 ${sideBySide ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}`}>
                <div className="@container min-w-0 rounded-2xl border border-white/6 bg-card" aria-label="Letter details" role="region">
                    <div className="flex flex-col gap-6 p-4 @xl:p-6 @3xl:p-7">
                        {/* Letter settings */}
                        <div className="grid gap-4 @xl:grid-cols-2">
                            <RField label="Name (for you)" value={state.title} onChange={value => set("title", value)} maxLength={120} />
                            <label className="flex min-w-0 flex-col gap-1.5">
                                <span className={labelClass}>Linked resume</span>
                                <select value={state.resume_id ?? ""} onChange={event => linkResume(event.target.value || null)} className={`${inputClass} [&>option]:bg-card`}>
                                    <option value="">None</option>
                                    {resumes.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
                                </select>
                            </label>
                            <div className="flex min-w-0 flex-col gap-1.5 @xl:col-span-2">
                                <span className={labelClass} id="letter-style">Style</span>
                                <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-surface p-1" role="radiogroup" aria-labelledby="letter-style">
                                    {COVER_STYLES.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            role="radio"
                                            aria-checked={state.style === option}
                                            onClick={() => set("style", option)}
                                            className={`flex min-h-12 flex-col items-center justify-center rounded-lg px-2 text-center transition-colors ${state.style === option ? "bg-white text-surface" : "text-muted hover:text-white"}`}
                                        >
                                            <span className="text-sm font-bold">{STYLE_INFO[option].label}</span>
                                            <span className={`text-[11px] ${state.style === option ? "text-surface/70" : "text-dim"}`}>{STYLE_INFO[option].hint}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Group
                            step={1}
                            title="From"
                            hint="Top of the letter, and repeated under your signature (without the address)."
                            action={<button type="button" onClick={applyResumeDetails} disabled={!resume} className={ghostButton}><LuUserRound aria-hidden="true" /> Use resume details</button>}
                        >
                            <RField label="Your name" value={state.sender_name} onChange={value => set("sender_name", value)} maxLength={120} placeholder={contact.fullName || "Your full name"} wide />
                            <RTextArea label="Contact lines" value={state.sender_contact} onChange={value => set("sender_contact", value)} maxLength={300} rows={2} placeholder={"0770000000 / 0880000000\nyou@example.com"} />
                            <RTextArea label="Address" value={state.sender_address} onChange={value => set("sender_address", value)} maxLength={300} rows={2} placeholder="Street, town" />
                        </Group>

                        <Group step={2} title="Date">
                            <RField label="Letter date" type="date" value={state.letter_date} onChange={value => set("letter_date", value)} hint="Shown as e.g. September 24, 2026." />
                        </Group>

                        <Group step={3} title="To" hint="One line per row: company, address, city, department.">
                            <RField label="Company" value={state.company} onChange={value => set("company", value)} maxLength={120} />
                            <RField label="Job title" value={state.job_title} onChange={value => set("job_title", value)} maxLength={120} placeholder="e.g. IT Officer" />
                            <RTextArea label="Recipient block" value={state.recipient} onChange={value => set("recipient", value)} maxLength={600} rows={4} placeholder={"Company name\nStreet, area\nCity, country\nHR Department"} />
                        </Group>

                        <Group step={4} title="Opening">
                            <RField label="Salutation" value={state.salutation} onChange={value => set("salutation", value)} maxLength={120} placeholder={DEFAULT_SALUTATION} hint="Empty = “Dear Hiring Manager,”" />
                            <RField label="Subject line (bold)" value={state.subject} onChange={value => set("subject", value)} maxLength={200} placeholder={autoSubject || "RE: Application for … Position"} hint={autoSubject ? "Empty = built from the job title" : "Add a job title or type a subject"} />
                        </Group>

                        <Group step={5} title="Body" hint="Blank line = new paragraph. No greeting or sign-off here; they have their own fields.">
                            <div className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/2 p-4 @xl:col-span-2">
                                <p className="flex items-center gap-2 text-sm font-bold"><LuSparkles className="text-accent-1" aria-hidden="true" /> Write with AI</p>
                                <div className="grid gap-3 @xl:grid-cols-2">
                                    <label className="flex min-w-0 flex-col gap-1.5">
                                        <span className={labelClass}>Tone</span>
                                        <select value={tone} onChange={event => setTone(event.target.value as typeof tone)} className={`${inputClass} capitalize [&>option]:bg-card`}>
                                            {COVER_TONES.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </label>
                                    <RField label="Anything to mention? (optional)" value={notes} onChange={setNotes} maxLength={1000} placeholder="e.g. available to start in March" />
                                    <label className="flex min-w-0 flex-col gap-1.5 @xl:col-span-2">
                                        <span className={labelClass}>Job description</span>
                                        <textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} rows={4} maxLength={20000} className={`${inputClass} field-sizing-content max-h-72 min-h-24 resize-y`} placeholder="Paste the job ad (defaults to the linked resume's saved job description)" />
                                    </label>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button type="button" onClick={generate} disabled={!resume || generating} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50">
                                        {generating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSparkles aria-hidden="true" />}
                                        {generating ? "Writing…" : "Generate draft"}
                                    </button>
                                    {!resume && <p className="text-xs text-dim">Link a resume first; the letter is written from its content.</p>}
                                </div>
                            </div>
                            <label className="flex min-w-0 flex-col gap-1.5 @xl:col-span-2">
                                <span className={labelClass}>Letter body</span>
                                <textarea value={state.body} onChange={event => set("body", event.target.value)} rows={16} maxLength={10000} className={`${inputClass} field-sizing-content min-h-72 resize-y leading-relaxed`} placeholder="I am writing to apply for…" />
                                <span className="text-right text-[11px] text-dim">{state.body.length}/10000</span>
                            </label>
                        </Group>

                        <Group step={6} title="Sign-off" hint="Followed by your name in bold and your contact lines.">
                            <RField label="Closing" value={state.closing} onChange={value => set("closing", value)} maxLength={60} placeholder={DEFAULT_CLOSING} hint="Empty = “Sincerely,”" />
                        </Group>
                    </div>
                </div>

                <div className={sideBySide ? "sticky top-6 h-[calc(100dvh-3rem)]" : ""}>
                    <PdfViewer
                        documentKey={JSON.stringify(documentProps)}
                        build={async () => {
                            const { default: CoverLetterDocument } = await import("@/components/resume/pdf/CoverLetterDocument")
                            return <CoverLetterDocument {...documentProps} />
                        }}
                        filename={`${state.title || "Cover letter"}`}
                        className="h-full min-h-[70vh]"
                    />
                </div>
            </div>
        </div>
    )
}
