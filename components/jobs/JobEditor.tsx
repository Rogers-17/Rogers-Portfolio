"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LuExternalLink, LuFilePlus2, LuLoaderCircle, LuMail, LuStar, LuTrash2, LuX } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { RField, labelClass } from "@/components/resume/controls"
import { adminFetch } from "@/lib/admin/client"
import { JOB_STATUSES, JOB_STATUS_INFO, jobInputSchema, type JobRecord, type JobStatus } from "@/lib/jobs/schema"

type Option = { id: string, title: string }

type FormState = {
    company: string
    role: string
    job_url: string
    location: string
    salary: string
    source: string
    status: JobStatus
    applied_on: string
    follow_up_on: string
    resume_id: string
    cover_letter_id: string
    priority: number
    notes: string
    is_archived: boolean
}

const toState = (job: JobRecord | null, defaultStatus: JobStatus): FormState => ({
    company: job?.company ?? "",
    role: job?.role ?? "",
    job_url: job?.job_url ?? "",
    location: job?.location ?? "",
    salary: job?.salary ?? "",
    source: job?.source ?? "",
    status: job?.status ?? defaultStatus,
    applied_on: job?.applied_on ?? "",
    follow_up_on: job?.follow_up_on ?? "",
    resume_id: job?.resume_id ?? "",
    cover_letter_id: job?.cover_letter_id ?? "",
    priority: job?.priority ?? 0,
    notes: job?.notes ?? "",
    is_archived: job?.is_archived ?? false,
})

type Props = {
    job: JobRecord | null
    defaultStatus: JobStatus
    resumes: Option[]
    letters: Option[]
    onClose: () => void
    onSaved: () => void
}

// Drawer on desktop, full screen on phones.
export default function JobEditor ({ job, defaultStatus, resumes, letters, onClose, onSaved }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const [state, setState] = React.useState(() => toState(job, defaultStatus))
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [busy, setBusy] = React.useState<string | null>(null)
    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState(current => ({ ...current, [key]: value }))
    const panelRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>("input")?.focus()
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
        document.addEventListener("keydown", onKey)
        const overflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = overflow
        }
    }, [onClose])

    const payload = () => ({ ...state, resume_id: state.resume_id || null, cover_letter_id: state.cover_letter_id || null })

    async function save (then?: (id: string) => Promise<void>) {
        const parsed = jobInputSchema.safeParse(payload())
        if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])))
            return null
        }
        setErrors({})
        setBusy("save")
        const result = await adminFetch<{ id: string }>(job ? `/api/admin/jobs/${job.id}` : "/api/admin/jobs", { json: parsed.data })
        if (!result.ok) {
            setBusy(null)
            notify(result.error.message, "error")
            return null
        }
        const id = job?.id ?? result.data.id
        if (then) await then(id)
        setBusy(null)
        notify(job ? "Application saved." : "Application added.")
        onSaved()
        return id
    }

    async function remove () {
        if (!job || !window.confirm(`Delete the application at ${job.company}?`)) return
        setBusy("delete")
        const result = await adminFetch(`/api/admin/jobs/${job.id}/delete`, { method: "POST" })
        setBusy(null)
        if (!result.ok) return notify(result.error.message, "error")
        notify("Application deleted.")
        onSaved()
        onClose()
    }

    // Duplicate the linked resume for this job, link the copy, and open it.
    async function tailorResume () {
        if (!state.resume_id) return notify("Choose a resume to copy first.", "error")
        setBusy("tailor")
        const copy = await adminFetch<{ id: string }>(`/api/admin/resumes/${state.resume_id}/duplicate`, { json: { title: `${state.role || "Resume"} – ${state.company || "job"}`.slice(0, 120) } })
        if (!copy.ok) {
            setBusy(null)
            return notify(copy.error.message, "error")
        }
        setState(current => ({ ...current, resume_id: copy.data.id }))
        const parsed = jobInputSchema.safeParse({ ...payload(), resume_id: copy.data.id })
        if (parsed.success) await adminFetch(job ? `/api/admin/jobs/${job.id}` : "/api/admin/jobs", { json: parsed.data })
        setBusy(null)
        router.push(`/admin/resumes/${copy.data.id}`)
    }

    async function createLetter () {
        setBusy("letter")
        const letter = await adminFetch<{ id: string }>("/api/admin/cover-letters", {
            json: { title: `${state.company || "Cover letter"} – ${state.role || "role"}`.slice(0, 120), resume_id: state.resume_id || null, company: state.company, job_title: state.role, body: "", letter_date: new Date().toISOString().slice(0, 10) },
        })
        if (!letter.ok) {
            setBusy(null)
            return notify(letter.error.message, "error")
        }
        const parsed = jobInputSchema.safeParse({ ...payload(), cover_letter_id: letter.data.id })
        if (parsed.success) await adminFetch(job ? `/api/admin/jobs/${job.id}` : "/api/admin/jobs", { json: parsed.data })
        setBusy(null)
        router.push(`/admin/cover-letters/${letter.data.id}`)
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={job ? `Edit ${job.company}` : "New application"}>
            <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div ref={panelRef} className="relative flex h-full w-full max-w-xl flex-col border-l border-white/8 bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
                    <h2 className="truncate text-lg font-bold">{job ? `${job.company} · ${job.role}` : "New application"}</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-white/6 hover:text-white"><LuX aria-hidden="true" /></button>
                </div>

                <form onSubmit={event => { event.preventDefault(); void save() }} noValidate className="flex-1 overflow-y-auto p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><RField label="Company *" value={state.company} onChange={value => set("company", value)} maxLength={120} />{errors.company && <p className="mt-1 text-xs text-rose-300">{errors.company}</p>}</div>
                        <div><RField label="Role *" value={state.role} onChange={value => set("role", value)} maxLength={120} />{errors.role && <p className="mt-1 text-xs text-rose-300">{errors.role}</p>}</div>
                        <label className="flex flex-col gap-1.5">
                            <span className={labelClass}>Status</span>
                            <select value={state.status} onChange={event => set("status", event.target.value as JobStatus)} className={`${inputClass} [&>option]:bg-card`}>
                                {JOB_STATUSES.map(status => <option key={status} value={status}>{JOB_STATUS_INFO[status].label}</option>)}
                            </select>
                        </label>
                        <div className="flex flex-col gap-1.5">
                            <span className={labelClass}>Priority</span>
                            <div className="flex min-h-10 items-center gap-1" role="radiogroup" aria-label="Priority">
                                {[1, 2, 3].map(level => (
                                    <button key={level} type="button" role="radio" aria-checked={state.priority === level} aria-label={`${level} star${level === 1 ? "" : "s"}`} onClick={() => set("priority", state.priority === level ? 0 : level)} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/6">
                                        <LuStar className={`size-5 ${state.priority >= level ? "fill-amber-300 text-amber-300" : "text-dim"}`} aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="sm:col-span-2"><RField label="Job link" value={state.job_url} onChange={value => set("job_url", value)} maxLength={500} placeholder="https://…" />{errors.job_url && <p className="mt-1 text-xs text-rose-300">{errors.job_url}</p>}</div>
                        <RField label="Location" value={state.location} onChange={value => set("location", value)} maxLength={120} placeholder="Remote, Monrovia…" />
                        <RField label="Salary" value={state.salary} onChange={value => set("salary", value)} maxLength={80} placeholder="e.g. $1,500/month" />
                        <RField label="Source" value={state.source} onChange={value => set("source", value)} maxLength={80} placeholder="LinkedIn, referral…" />
                        <RField label="Applied on" type="date" value={state.applied_on} onChange={value => set("applied_on", value)} />
                        <RField label="Follow up on" type="date" value={state.follow_up_on} onChange={value => set("follow_up_on", value)} />
                        <label className="flex flex-col gap-1.5">
                            <span className={labelClass}>Resume sent</span>
                            <select value={state.resume_id} onChange={event => set("resume_id", event.target.value)} className={`${inputClass} [&>option]:bg-card`}>
                                <option value="">None</option>
                                {resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className={labelClass}>Cover letter</span>
                            <select value={state.cover_letter_id} onChange={event => set("cover_letter_id", event.target.value)} className={`${inputClass} [&>option]:bg-card`}>
                                <option value="">None</option>
                                {letters.map(letter => <option key={letter.id} value={letter.id}>{letter.title}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className={labelClass}>Notes</span>
                            <textarea value={state.notes} onChange={event => set("notes", event.target.value)} rows={5} maxLength={5000} className={`${inputClass} field-sizing-content min-h-28 resize-y`} placeholder="Interview dates, contacts, questions to ask…" />
                        </label>
                        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
                            <input type="checkbox" checked={state.is_archived} onChange={event => set("is_archived", event.target.checked)} className="size-4 accent-accent-1" />
                            Archived (hidden from the board)
                        </label>
                    </div>

                    <div className="mt-6 grid gap-2 rounded-xl border border-white/6 bg-white/2 p-3 sm:grid-cols-2">
                        {state.job_url && /^https?:\/\//.test(state.job_url) && <a href={state.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-white/6 hover:text-white"><LuExternalLink aria-hidden="true" /> Open job posting</a>}
                        {state.resume_id && <a href={`/admin/resumes/${state.resume_id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-white/6 hover:text-white"><LuExternalLink aria-hidden="true" /> Open resume</a>}
                        {state.cover_letter_id && <a href={`/admin/cover-letters/${state.cover_letter_id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-white/6 hover:text-white"><LuExternalLink aria-hidden="true" /> Open cover letter</a>}
                        <button type="button" onClick={tailorResume} disabled={busy !== null || !state.resume_id} title={state.resume_id ? undefined : "Choose a resume first"} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-accent-1 hover:bg-accent-1/10 disabled:opacity-40">
                            {busy === "tailor" ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuFilePlus2 aria-hidden="true" />} Tailored resume for this job
                        </button>
                        <button type="button" onClick={createLetter} disabled={busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-accent-1 hover:bg-accent-1/10 disabled:opacity-40">
                            {busy === "letter" ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuMail aria-hidden="true" />} Create a cover letter
                        </button>
                    </div>
                </form>

                <div className="flex items-center justify-between gap-2 border-t border-white/6 px-5 py-4">
                    {job ? (
                        <button type="button" onClick={remove} disabled={busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
                            <LuTrash2 aria-hidden="true" /> Delete
                        </button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-muted hover:text-white">Cancel</button>
                        <button type="button" onClick={async () => { if (await save()) onClose() }} disabled={busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-6 text-sm font-bold text-white disabled:opacity-50">
                            {busy === "save" && <LuLoaderCircle className="animate-spin" aria-hidden="true" />} {job ? "Save" : "Add application"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
