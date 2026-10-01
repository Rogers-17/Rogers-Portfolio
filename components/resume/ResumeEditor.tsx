"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LuBriefcase, LuEye, LuLoaderCircle, LuPencil, LuSave, LuShare2, LuX } from "react-icons/lu"
import { useUnsavedGuard } from "@/components/admin/form-hooks"
import { useToast } from "@/components/admin/Toast"
import ContactForm from "@/components/resume/ContactForm"
import DesignForm from "@/components/resume/DesignForm"
import EditorPanel, { type Selection, type Tab } from "@/components/resume/EditorPanel"
import FinishPanel from "@/components/resume/FinishPanel"
import HistoryPanel from "@/components/resume/HistoryPanel"
import SharePanel from "@/components/resume/SharePanel"
import PdfPreview from "@/components/resume/PdfPreview"
import SectionEditor from "@/components/resume/SectionEditor"
import CopilotPanel from "@/components/resume/ai/CopilotPanel"
import InsightsPanel from "@/components/resume/ai/InsightsPanel"
import TailorPanel from "@/components/resume/ai/TailorPanel"
import { AiProvider, type AiUsage } from "@/components/resume/ai/context"
import { adminFetch } from "@/lib/admin/client"
import { resumeToText } from "@/lib/resume/normalize"
import { newSection, type ResumeData, type ResumeRecord, type ResumeSection, type SectionType, type TailorKeyword } from "@/lib/resume/schema"

type Props = { resume: ResumeRecord, photoUrl: string | null, usage: AiUsage | null, applications?: number }

type EditorState = Pick<ResumeRecord, "title" | "target_role" | "template" | "design" | "data" | "job_description" | "job_company">

const toState = (resume: ResumeRecord): EditorState => ({
    title: resume.title,
    target_role: resume.target_role,
    template: resume.template,
    design: resume.design,
    data: resume.data,
    job_description: resume.job_description,
    job_company: resume.job_company,
})

const subscribeWide = (callback: () => void) => {
    const query = window.matchMedia("(min-width: 1440px)")
    query.addEventListener("change", callback)
    return () => query.removeEventListener("change", callback)
}

export default function ResumeEditor ({ resume, photoUrl: initialPhotoUrl, usage, applications = 0 }: Props) {
    const router = useRouter()
    const { notify } = useToast()
    const [state, setState] = React.useState(() => toState(resume))
    const [saved, setSaved] = React.useState(() => JSON.stringify(toState(resume)))
    const [saving, setSaving] = React.useState(false)
    const [tab, setTab] = React.useState<Tab>("sections")
    const [selected, setSelected] = React.useState<Selection>("contact")
    const [photoUrl, setPhotoUrl] = React.useState(initialPhotoUrl)
    const [keywords, setKeywords] = React.useState<TailorKeyword[]>(resume.tailor_keywords)
    const [pages, setPages] = React.useState(0)
    const [showPreview, setShowPreview] = React.useState(false)
    const [editingTitle, setEditingTitle] = React.useState(false)
    const [savedCount, setSavedCount] = React.useState(0)
    const wide = React.useSyncExternalStore(subscribeWide, () => window.matchMedia("(min-width: 1440px)").matches, () => false)

    const dirty = JSON.stringify(state) !== saved
    useUnsavedGuard(dirty)

    const stateRef = React.useRef(state)
    React.useEffect(() => {
        stateRef.current = state
    }, [state])

    const setData = React.useCallback((update: (data: ResumeData) => ResumeData) => setState(current => ({ ...current, data: update(current.data) })), [])
    const setSections = (sections: ResumeSection[]) => setData(data => ({ ...data, sections }))

    const save = React.useCallback(async () => {
        const snapshot = stateRef.current
        setSaving(true)
        const result = await adminFetch(`/api/admin/resumes/${resume.id}`, { json: snapshot })
        setSaving(false)
        if (!result.ok) {
            notify(result.error.issues?.[0]?.message ?? result.error.message, "error")
            return false
        }
        setSaved(JSON.stringify(snapshot))
        setSavedCount(count => count + 1)
        notify("Resume saved.")
        return true
    }, [notify, resume.id])

    // Ctrl/⌘ + S saves.
    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault()
                void save()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [save])

    // Signed photo URLs last an hour: refresh while the editor stays open.
    React.useEffect(() => {
        const path = state.data.contact.photoPath
        if (!path) return
        const refresh = async () => {
            const result = await adminFetch<{ url: string }>("/api/admin/resumes/photo-url", { json: { path } })
            if (result.ok) setPhotoUrl(result.data.url)
        }
        const timer = setInterval(refresh, 45 * 60 * 1000)
        return () => clearInterval(timer)
    }, [state.data.contact.photoPath])

    function addSection (type: SectionType) {
        const section = newSection(type)
        setSections([...state.data.sections, section])
        setSelected(`section:${section.id}`)
        setTab("sections")
    }

    const resumeText = React.useCallback(() => resumeToText(stateRef.current.data), [])
    const activeSection = selected.startsWith("section:") ? state.data.sections.find(section => `section:${section.id}` === selected) : undefined

    let content: React.ReactNode
    if (tab === "insights") {
        content = <InsightsPanel data={state.data} pages={pages} keywords={keywords} jobDescription={state.job_description ?? ""} onOpenTailor={() => setTab("tailor")} />
    } else if (tab === "tailor") {
        content = (
            <TailorPanel
                resumeId={resume.id}
                data={state.data}
                jobDescription={state.job_description ?? ""}
                jobCompany={state.job_company ?? ""}
                keywords={keywords}
                onJob={(jobDescription, jobCompany) => setState(current => ({ ...current, job_description: jobDescription || null, job_company: jobCompany || null }))}
                onKeywords={setKeywords}
                onData={setData}
                onDuplicate={id => router.push(`/admin/resumes/${id}`)}
                beforeDuplicate={async () => (dirty ? save() : true)}
            />
        )
    } else if (selected === "copilot") {
        content = <CopilotPanel />
    } else if (selected === "design") {
        content = <DesignForm template={state.template} design={state.design} onTemplate={template => setState(current => ({ ...current, template }))} onDesign={design => setState(current => ({ ...current, design }))} />
    } else if (selected === "history") {
        content = (
            <HistoryPanel
                resumeId={resume.id}
                photoUrl={photoUrl}
                refreshKey={savedCount}
                current={() => ({ title: stateRef.current.title, template: stateRef.current.template, design: stateRef.current.design, data: stateRef.current.data })}
                onRestore={version => setState(current => ({ ...current, title: version.title, template: version.template, design: version.design, data: version.data }))}
            />
        )
    } else if (selected === "share") {
        content = (
            <SharePanel
                resumeId={resume.id}
                photoUrl={photoUrl}
                showPhoto={state.design.showPhoto}
                hasPhoto={Boolean(state.data.contact.photoPath)}
                dirty={dirty}
                save={save}
            />
        )
    } else if (selected === "finish") {
        content = <FinishPanel data={state.data} pages={pages} onGo={setSelected} onInsights={() => setTab("insights")} />
    } else if (activeSection) {
        content = (
            <SectionEditor
                key={activeSection.id}
                section={activeSection}
                onChange={section => setSections(state.data.sections.map(entry => (entry.id === section.id ? section : entry)))}
                onRemove={() => {
                    setSections(state.data.sections.filter(entry => entry.id !== activeSection.id))
                    setSelected("contact")
                }}
            />
        )
    } else {
        content = (
            <ContactForm
                contact={state.data.contact}
                photoUrl={photoUrl}
                onChange={contact => setData(data => ({ ...data, contact }))}
                onPhoto={(path, url) => {
                    setData(data => ({ ...data, contact: { ...data.contact, photoPath: path } }))
                    setPhotoUrl(url)
                }}
            />
        )
    }

    const preview = (
        <PdfPreview template={state.template} design={state.design} data={state.data} photoUrl={photoUrl} title={state.title} onPages={setPages} className="h-full" />
    )

    return (
        <AiProvider resumeText={resumeText} targetRole={state.target_role ?? ""} jobDescription={state.job_description ?? ""} initialUsage={usage}>
            <div className="flex flex-col gap-4">
                {/* Top bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <nav aria-label="Breadcrumb" className="text-[11px] font-semibold tracking-[0.2em] text-dim uppercase">
                            <Link href="/admin" className="hover:text-white">Dashboard</Link>
                            <span className="mx-2">/</span>
                            <Link href="/admin/resumes" className="hover:text-white">Resumes</Link>
                            <span className="mx-2">/</span>
                            <span className="text-fg">Editor</span>
                        </nav>
                        {editingTitle ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <input autoFocus aria-label="Resume name" value={state.title} maxLength={120} onChange={event => setState(current => ({ ...current, title: event.target.value }))} className="min-h-9 rounded-lg border border-white/10 bg-white/4 px-3 text-sm focus:border-accent-1 focus:outline-none" />
                                <input aria-label="Target role" placeholder="Target role" value={state.target_role ?? ""} maxLength={120} onChange={event => setState(current => ({ ...current, target_role: event.target.value || null }))} className="min-h-9 rounded-lg border border-white/10 bg-white/4 px-3 text-sm focus:border-accent-1 focus:outline-none" />
                                <button type="button" onClick={() => setEditingTitle(false)} aria-label="Done" className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white/6 hover:text-white"><LuX aria-hidden="true" /></button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setEditingTitle(true)} className="group mt-1 flex max-w-full items-center gap-2 text-left">
                                <h1 className="truncate text-xl font-bold md:text-2xl">{state.title}</h1>
                                <LuPencil className="shrink-0 text-dim group-hover:text-white" aria-label="Rename" />
                            </button>
                        )}
                        {applications > 0 && (
                            <Link href={`/admin/jobs?resume=${resume.id}`} className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted hover:text-white">
                                <LuBriefcase aria-hidden="true" /> Used in {applications} application{applications === 1 ? "" : "s"}
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-muted sm:inline" aria-live="polite">{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
                        <button type="button" onClick={() => { setSelected("share"); setTab("sections") }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 text-sm font-semibold hover:border-accent-1">
                            <LuShare2 aria-hidden="true" /> <span className="hidden sm:inline">Share</span>
                        </button>
                        {!wide && (
                            <button type="button" onClick={() => setShowPreview(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 text-sm font-semibold hover:border-accent-1">
                                <LuEye aria-hidden="true" /> Preview
                            </button>
                        )}
                        <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] disabled:opacity-50">
                            {saving ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSave aria-hidden="true" />}
                            Save
                        </button>
                    </div>
                </div>

                <div className={`grid items-start gap-4 ${wide ? "grid-cols-[17rem_minmax(0,1fr)_minmax(0,0.95fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]"}`}>
                    <EditorPanel
                        title={state.title}
                        targetRole={state.target_role ?? ""}
                        tab={tab}
                        onTab={setTab}
                        selected={selected}
                        onSelect={selection => { setSelected(selection); setTab("sections") }}
                        sections={state.data.sections}
                        onSections={setSections}
                        onAddSection={addSection}
                        usage={usage}
                    />
                    <section className="min-w-0 rounded-2xl border border-white/6 bg-card p-4 md:p-7" aria-label="Editor">
                        {content}
                    </section>
                    {wide && <div className="sticky top-6 h-[calc(100dvh-3rem)]">{preview}</div>}
                </div>
            </div>

            {!wide && showPreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-surface/95 p-3 backdrop-blur md:p-6" role="dialog" aria-modal="true" aria-label="Preview">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">Preview</p>
                        <button type="button" onClick={() => setShowPreview(false)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold hover:border-accent-1" autoFocus>
                            <LuX aria-hidden="true" /> Close
                        </button>
                    </div>
                    <div className="min-h-0 flex-1">{preview}</div>
                </div>
            )}
        </AiProvider>
    )
}
