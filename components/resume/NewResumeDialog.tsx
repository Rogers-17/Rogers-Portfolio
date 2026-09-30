"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LuCopy, LuFilePlus2, LuFileUp, LuLoaderCircle, LuX } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { RField, labelClass } from "@/components/resume/controls"
import { adminFetch } from "@/lib/admin/client"
import { SECTION_LABELS, TEMPLATES, TEMPLATE_INFO, type ResumeData, type TemplateKey } from "@/lib/resume/schema"

type Start = "blank" | "copy" | "import"

type Props = {
    open: boolean
    onClose: () => void
    resumes: { id: string, title: string }[]
    defaultTemplate: TemplateKey
}

export default function NewResumeDialog ({ open, onClose, resumes, defaultTemplate }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const dialogRef = React.useRef<HTMLDialogElement>(null)
    const [start, setStart] = React.useState<Start>("blank")
    const [title, setTitle] = React.useState("")
    const [targetRole, setTargetRole] = React.useState("")
    const [template, setTemplate] = React.useState<TemplateKey>(defaultTemplate)
    const [copyId, setCopyId] = React.useState(resumes[0]?.id ?? "")
    const [pasted, setPasted] = React.useState("")
    const [file, setFile] = React.useState<File | null>(null)
    const [imported, setImported] = React.useState<ResumeData | null>(null)
    const [busy, setBusy] = React.useState<"import" | "create" | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    async function runImport () {
        setBusy("import")
        setError(null)
        let result
        if (file) {
            const body = new FormData()
            body.set("file", file)
            result = await adminFetch<{ data: ResumeData }>("/api/admin/ai/import", { body })
        } else {
            result = await adminFetch<{ data: ResumeData }>("/api/admin/ai/import", { json: { text: pasted } })
        }
        setBusy(null)
        if (!result.ok) {
            setError(result.error.message)
            return
        }
        setImported(result.data.data)
        if (!title.trim()) setTitle(`${result.data.data.contact.fullName || "Imported"} – CV`.slice(0, 120))
        if (!targetRole.trim() && result.data.data.contact.headline) setTargetRole(result.data.data.contact.headline.slice(0, 120))
    }

    async function create () {
        setBusy("create")
        setError(null)
        const name = title.trim() || "Untitled resume"
        const result = start === "copy"
            ? await adminFetch<{ id: string }>(`/api/admin/resumes/${copyId}/duplicate`, { json: { title: name } })
            : await adminFetch<{ id: string }>("/api/admin/resumes", { json: { title: name, target_role: targetRole, template, ...(start === "import" && imported ? { data: imported } : {}) } })
        setBusy(null)
        if (!result.ok) {
            setError(result.error.message)
            return
        }
        notify("Resume created.")
        router.push(`/admin/resumes/${result.data.id}`)
    }

    const options: { key: Start, label: string, hint: string, icon: typeof LuFilePlus2, disabled?: boolean }[] = [
        { key: "blank", label: "Start blank", hint: "Empty sections to fill in", icon: LuFilePlus2 },
        { key: "copy", label: "Copy a resume", hint: resumes.length ? "Duplicate one for a new job" : "No resumes yet", icon: LuCopy, disabled: resumes.length === 0 },
        { key: "import", label: "Import CV", hint: "Upload a PDF or paste text (AI)", icon: LuFileUp },
    ]

    const canCreate = start !== "import" || imported !== null

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={event => { if (event.target === dialogRef.current) onClose() }}
            aria-labelledby="new-resume-title"
            className="m-auto w-[min(40rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/8 bg-card p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        >
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
                <h2 id="new-resume-title" className="text-lg font-bold">New resume</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-white/6 hover:text-white"><LuX aria-hidden="true" /></button>
            </div>

            <div className="flex flex-col gap-5 p-5">
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How to start">
                    {options.map(({ key, label, hint, icon: Icon, disabled }) => (
                        <button key={key} type="button" role="radio" aria-checked={start === key} disabled={disabled} onClick={() => { setStart(key); setError(null) }} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:opacity-40 ${start === key ? "border-accent-1 bg-accent-1/8" : "border-white/8 bg-white/2 hover:border-white/25"}`}>
                            <Icon className="text-accent-1" aria-hidden="true" />
                            <span className="text-sm font-semibold">{label}</span>
                            <span className="text-xs text-muted">{hint}</span>
                        </button>
                    ))}
                </div>

                {start === "copy" && (
                    <label className="flex flex-col gap-1.5">
                        <span className={labelClass}>Resume to copy</span>
                        <select value={copyId} onChange={event => setCopyId(event.target.value)} className={`${inputClass} [&>option]:bg-card`}>
                            {resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
                        </select>
                    </label>
                )}

                {start === "import" && !imported && (
                    <div className="flex flex-col gap-3 rounded-xl border border-white/6 bg-white/2 p-4">
                        <label className="flex flex-col gap-1.5">
                            <span className={labelClass}>PDF file (max 5 MB)</span>
                            <input type="file" accept="application/pdf" onChange={event => { setFile(event.target.files?.[0] ?? null); setPasted("") }} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
                        </label>
                        <p className="text-center text-xs text-dim">or</p>
                        <label className="flex flex-col gap-1.5">
                            <span className={labelClass}>Paste your CV text</span>
                            <textarea value={pasted} onChange={event => { setPasted(event.target.value); setFile(null) }} rows={5} maxLength={40000} className={`${inputClass} resize-y`} placeholder="Paste the full text of your CV…" />
                        </label>
                        <button type="button" onClick={runImport} disabled={busy !== null || (!file && pasted.trim().length < 80)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white disabled:opacity-50">
                            {busy === "import" ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuFileUp aria-hidden="true" />}
                            {busy === "import" ? "Reading your CV… (up to a minute)" : "Read CV with AI"}
                        </button>
                        <p className="text-xs text-dim">Uses 1 AI request. Your wording is copied as-is; you review it before anything is saved.</p>
                    </div>
                )}

                {start === "import" && imported && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm">
                        <p className="font-semibold text-emerald-100">Imported: {imported.contact.fullName || "No name found"}</p>
                        <ul className="mt-2 grid gap-1 text-muted sm:grid-cols-2">
                            {imported.sections.map(section => <li key={section.id}>{section.title || SECTION_LABELS[section.type]}: {section.items.length} {section.items.length === 1 ? "entry" : "entries"}</li>)}
                        </ul>
                        <button type="button" onClick={() => setImported(null)} className="mt-3 text-xs font-semibold text-muted hover:text-white">Import a different file</button>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <RField label="Resume name" value={title} onChange={setTitle} maxLength={120} placeholder="e.g. Frontend Developer – Acme" />
                    {start !== "copy" && <RField label="Target role" value={targetRole} onChange={setTargetRole} maxLength={120} placeholder="e.g. Database Administrator" />}
                </div>

                {start !== "copy" && (
                    <div>
                        <p className={labelClass}>Template</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {TEMPLATES.map(key => (
                                <button key={key} type="button" aria-pressed={template === key} onClick={() => setTemplate(key)} className={`min-h-9 rounded-full border px-4 text-sm font-semibold ${template === key ? "border-accent-1 bg-accent-1/10 text-white" : "border-white/10 text-muted hover:text-white"}`}>
                                    {TEMPLATE_INFO[key].label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/6 px-5 py-4">
                <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-muted hover:text-white">Cancel</button>
                <button type="button" onClick={create} disabled={busy !== null || !canCreate} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-6 text-sm font-bold text-white disabled:opacity-50">
                    {busy === "create" && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                    Create resume
                </button>
            </div>
        </dialog>
    )
}
