"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuLoaderCircle, LuSave, LuSparkles, LuTrash2 } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { inputClass } from "@/components/admin/Field"
import { useUnsavedGuard } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"
import { PanelHeading, RField, labelClass } from "@/components/resume/controls"
import { PdfViewer } from "@/components/resume/PdfPreview"
import { adminFetch } from "@/lib/admin/client"
import { COVER_TONES, coverLetterInputSchema } from "@/lib/resume/cover-letter"
import { resumeToText } from "@/lib/resume/normalize"
import type { CoverLetterRecord } from "@/lib/resume/queries"
import { blankResume, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

export type LinkableResume = { id: string, title: string, template: TemplateKey, design: ResumeDesign, data: ResumeData, job_description: string | null, job_company: string | null, target_role: string | null }

type FormState = { resume_id: string | null, title: string, company: string, job_title: string, recipient: string, letter_date: string, body: string }

const toState = (letter: CoverLetterRecord): FormState => ({
    resume_id: letter.resume_id,
    title: letter.title,
    company: letter.company ?? "",
    job_title: letter.job_title ?? "",
    recipient: letter.recipient ?? "",
    letter_date: letter.letter_date ?? "",
    body: letter.body,
})

// Dates are shown as written (UTC calendar day), so server and browser agree.
function longDate (iso: string) {
    if (!iso) return ""
    const date = new Date(`${iso}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
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

    const dirty = JSON.stringify(state) !== saved
    useUnsavedGuard(dirty)
    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))
    const resume = resumes.find(entry => entry.id === state.resume_id) ?? null

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
    const template = resume?.template ?? "professional"
    const design = resume?.design ?? { accent: null, density: "normal" as const, paper: "A4" as const, showPhoto: false }
    const documentProps = { contact, template, design, recipient: state.recipient, company: state.company, jobTitle: state.job_title, date: longDate(state.letter_date), body: state.body, title: state.title }

    return (
        <div className="flex flex-col gap-4">
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
                    <span className="hidden text-xs text-muted sm:inline">{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
                    <button type="button" onClick={remove} aria-label="Delete cover letter" className="inline-flex size-10 items-center justify-center rounded-full text-rose-300 hover:bg-rose-500/10"><LuTrash2 aria-hidden="true" /></button>
                    <button type="button" onClick={save} disabled={saving || !dirty} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50">
                        {saving ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSave aria-hidden="true" />} Save
                    </button>
                </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="min-w-0 rounded-2xl border border-white/6 bg-card p-4 md:p-7" aria-label="Letter details">
                    <PanelHeading title="Letter" subtitle="Linked resume provides your name, contact details and style." />
                    <div className="grid gap-4 md:grid-cols-2">
                        <RField label="Name (for you)" value={state.title} onChange={value => set("title", value)} maxLength={120} />
                        <label className="flex flex-col gap-1.5">
                            <span className={labelClass}>Linked resume</span>
                            <select value={state.resume_id ?? ""} onChange={event => { const id = event.target.value || null; set("resume_id", id); setJobDescription(resumes.find(entry => entry.id === id)?.job_description ?? jobDescription) }} className={`${inputClass} [&>option]:bg-card`}>
                                <option value="">None</option>
                                {resumes.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
                            </select>
                        </label>
                        <RField label="Company" value={state.company} onChange={value => set("company", value)} maxLength={120} />
                        <RField label="Job title" value={state.job_title} onChange={value => set("job_title", value)} maxLength={120} />
                        <RField label="Recipient" value={state.recipient} onChange={value => set("recipient", value)} maxLength={300} placeholder="e.g. Ms. Jane Doe, HR Manager" />
                        <RField label="Date" type="date" value={state.letter_date} onChange={value => set("letter_date", value)} />
                    </div>

                    <div className="mt-6 rounded-xl border border-white/6 bg-white/2 p-4">
                        <p className="flex items-center gap-2 text-sm font-bold"><LuSparkles className="text-accent-1" aria-hidden="true" /> Write with AI</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className={labelClass}>Tone</span>
                                <select value={tone} onChange={event => setTone(event.target.value as typeof tone)} className={`${inputClass} capitalize [&>option]:bg-card`}>
                                    {COVER_TONES.map(option => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>
                            <RField label="Anything to mention? (optional)" value={notes} onChange={setNotes} maxLength={1000} placeholder="e.g. available to start in March" />
                            <label className="flex flex-col gap-1.5 md:col-span-2">
                                <span className={labelClass}>Job description</span>
                                <textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} rows={4} maxLength={20000} className={`${inputClass} field-sizing-content min-h-24 max-h-72 resize-y`} placeholder="Paste the job ad (defaults to the linked resume's saved job description)" />
                            </label>
                        </div>
                        <button type="button" onClick={generate} disabled={!resume || generating} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50">
                            {generating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSparkles aria-hidden="true" />}
                            {generating ? "Writing…" : "Generate draft"}
                        </button>
                        {!resume && <p className="mt-2 text-xs text-dim">Link a resume first; the letter is written from its content.</p>}
                    </div>

                    <label className="mt-6 flex flex-col gap-1.5">
                        <span className={labelClass}>Letter body</span>
                        <textarea value={state.body} onChange={event => set("body", event.target.value)} rows={16} maxLength={10000} className={`${inputClass} field-sizing-content min-h-72 resize-y leading-relaxed`} placeholder="Dear Hiring Manager, …" />
                        <span className="text-right text-[11px] text-dim">{state.body.length}/10000 · blank line = new paragraph</span>
                    </label>
                </section>

                <div className="xl:sticky xl:top-6 xl:h-[calc(100dvh-3rem)]">
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
