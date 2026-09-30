"use client"

import * as React from "react"
import { LuCheck, LuCopy, LuLoaderCircle, LuWandSparkles, LuX } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import { useToast } from "@/components/admin/Toast"
import { PanelHeading, RField, ghostButton, labelClass } from "@/components/resume/controls"
import { useAi } from "@/components/resume/ai/context"
import { adminFetch } from "@/lib/admin/client"
import { keywordCoverage } from "@/lib/resume/insights"
import type { ResumeData, TailorKeyword } from "@/lib/resume/schema"

export type TailorSuggestion = {
    id: string
    kind: "summary" | "bullet"
    sectionId: string
    itemId: string
    index: number
    before: string
    after: string
    reason: string
}

type TailorResult = { keywords: TailorKeyword[], suggestions: TailorSuggestion[], advice: string[] }

type Props = {
    resumeId: string
    data: ResumeData
    jobDescription: string
    jobCompany: string
    keywords: TailorKeyword[]
    onJob: (jobDescription: string, jobCompany: string) => void
    onKeywords: (keywords: TailorKeyword[]) => void
    onData: (update: (data: ResumeData) => ResumeData) => void
    onDuplicate: (id: string) => void
    beforeDuplicate: () => Promise<boolean>
}

// Applies a suggestion only if its target still holds the original text.
function applySuggestion (data: ResumeData, suggestion: TailorSuggestion): ResumeData | null {
    let applied = false
    const sections = data.sections.map(section => {
        if (section.id !== suggestion.sectionId) return section
        const items = (section.items as Record<string, unknown>[]).map(item => {
            if (item.id !== suggestion.itemId) return item
            if (suggestion.kind === "summary" && typeof item.text === "string") {
                applied = true
                return { ...item, text: suggestion.after }
            }
            const bullets = Array.isArray(item.bullets) ? [...(item.bullets as string[])] : null
            if (bullets && bullets[suggestion.index] !== undefined && bullets[suggestion.index].trim() === suggestion.before.trim()) {
                bullets[suggestion.index] = suggestion.after
                applied = true
                return { ...item, bullets }
            }
            return item
        })
        return { ...section, items } as typeof section
    })
    return applied ? { ...data, sections } : null
}

export default function TailorPanel ({ resumeId, data, jobDescription, jobCompany, keywords, onJob, onKeywords, onData, onDuplicate, beforeDuplicate }: Props) {
    const ai = useAi()
    const { notify } = useToast()
    const [loading, setLoading] = React.useState(false)
    const [duplicating, setDuplicating] = React.useState(false)
    const [result, setResult] = React.useState<TailorResult | null>(null)
    const [handled, setHandled] = React.useState<Set<string>>(new Set())
    const coverage = keywordCoverage(data, keywords)
    const limited = ai?.usage ? ai.usage.used >= ai.usage.limit : false

    async function analyze () {
        if (!ai) return
        setLoading(true)
        const response = await ai.request<TailorResult>("tailor", { resumeId, data, jobDescription, jobCompany, targetRole: ai.targetRole })
        setLoading(false)
        if (!response.ok) {
            notify(response.error.message, "error")
            return
        }
        setResult(response.data)
        setHandled(new Set())
        onKeywords(response.data.keywords)
    }

    async function duplicate () {
        setDuplicating(true)
        const ready = await beforeDuplicate()
        if (!ready) {
            setDuplicating(false)
            return
        }
        const title = jobCompany ? `Resume – ${jobCompany}` : undefined
        const response = await adminFetch<{ id: string }>(`/api/admin/resumes/${resumeId}/duplicate`, { json: { title } })
        setDuplicating(false)
        if (!response.ok) {
            notify(response.error.message, "error")
            return
        }
        notify("Copy created. Tailor the copy; the original stays as it is.")
        onDuplicate(response.data.id)
    }

    function accept (suggestion: TailorSuggestion) {
        const next = applySuggestion(data, suggestion)
        if (!next) {
            notify("That text changed since the analysis, so the suggestion was skipped.", "error")
        } else {
            onData(() => next)
        }
        setHandled(current => new Set(current).add(suggestion.id))
    }

    const open = result?.suggestions.filter(suggestion => !handled.has(suggestion.id)) ?? []

    return (
        <div>
            <PanelHeading
                title="Tailor to a job"
                subtitle="Paste the job ad. AI finds the keywords and suggests rewrites you accept one by one."
                action={<button type="button" onClick={duplicate} disabled={duplicating} className={ghostButton}>{duplicating ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuCopy aria-hidden="true" />} Duplicate for this job</button>}
            />

            <div className="grid gap-4">
                <RField label="Company" value={jobCompany} onChange={value => onJob(jobDescription, value)} maxLength={120} placeholder="Who is hiring?" />
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="job-description" className={labelClass}>Job description</label>
                    <textarea id="job-description" value={jobDescription} onChange={event => onJob(event.target.value, jobCompany)} maxLength={20000} rows={8} placeholder="Paste the full job posting here…" className={`${inputClass} field-sizing-content min-h-40 max-h-[50vh] resize-y leading-relaxed`} />
                    <p className="text-right text-[11px] text-dim">{jobDescription.length}/20000 · saved with the resume</p>
                </div>
                <button type="button" onClick={analyze} disabled={loading || jobDescription.trim().length < 80 || limited} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-6 text-sm font-bold text-white disabled:opacity-50 sm:self-start">
                    {loading ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuWandSparkles aria-hidden="true" />}
                    {loading ? "Analysing…" : result ? "Analyse again" : "Analyse & suggest"}
                </button>
                {jobDescription.trim().length < 80 && <p className="text-xs text-dim">Paste at least a few lines of the job description.</p>}
                {limited && <p className="text-xs text-rose-300">Daily AI limit reached.</p>}
            </div>

            {keywords.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-bold">Keyword match {coverage.percent !== null && <span className="text-accent-1">{coverage.percent}%</span>}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {coverage.matched.map(keyword => <span key={keyword.keyword} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">✓ {keyword.keyword}</span>)}
                        {coverage.missing.map(keyword => <span key={keyword.keyword} className={`rounded-full px-3 py-1 text-xs font-semibold ${keyword.importance === "high" ? "bg-rose-500/15 text-rose-200" : "bg-white/6 text-muted"}`}>+ {keyword.keyword}</span>)}
                    </div>
                </div>
            )}

            {result && (
                <div className="mt-8 flex flex-col gap-4">
                    {result.advice.length > 0 && (
                        <div className="rounded-xl border border-white/6 bg-white/2 p-4 text-sm">
                            <p className="font-semibold">Advice</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{result.advice.map((line, index) => <li key={index}>{line}</li>)}</ul>
                        </div>
                    )}
                    <h3 className="text-sm font-bold">Suggested changes ({open.length})</h3>
                    {open.length === 0 && <p className="text-sm text-muted">{result.suggestions.length ? "All suggestions handled." : "No rewrites suggested; your resume already fits well."}</p>}
                    {open.map(suggestion => (
                        <div key={suggestion.id} className="rounded-xl border border-white/8 bg-white/2 p-4">
                            <p className="text-[11px] font-semibold tracking-wider text-dim uppercase">{suggestion.kind === "summary" ? "Summary" : "Bullet"}</p>
                            <p className="mt-2 text-sm text-muted line-through decoration-rose-400/60">{suggestion.before || "(empty)"}</p>
                            <p className="mt-2 text-sm leading-relaxed text-fg">{suggestion.after}</p>
                            {suggestion.reason && <p className="mt-2 text-xs text-dim">Why: {suggestion.reason}</p>}
                            <div className="mt-3 flex gap-2">
                                <button type="button" onClick={() => accept(suggestion)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"><LuCheck aria-hidden="true" /> Accept</button>
                                <button type="button" onClick={() => setHandled(current => new Set(current).add(suggestion.id))} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-white/6 hover:text-white"><LuX aria-hidden="true" /> Dismiss</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
