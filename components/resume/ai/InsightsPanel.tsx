"use client"

import { LuCircleAlert, LuInfo, LuTriangleAlert, LuWandSparkles } from "react-icons/lu"
import { PanelHeading, ghostButton } from "@/components/resume/controls"
import { keywordCoverage, qualityScore, runChecks, type Check } from "@/lib/resume/insights"
import type { ResumeData, TailorKeyword } from "@/lib/resume/schema"

type Props = {
    data: ResumeData
    pages: number
    keywords: TailorKeyword[]
    jobDescription: string
    onOpenTailor: () => void
}

const LEVEL = {
    error: { icon: LuCircleAlert, className: "text-rose-300", label: "Fix" },
    warning: { icon: LuTriangleAlert, className: "text-amber-200", label: "Improve" },
    tip: { icon: LuInfo, className: "text-sky-200", label: "Tip" },
} as const

function Ring ({ value, label }: { value: number, label: string }) {
    const color = value >= 75 ? "#34d399" : value >= 50 ? "#fbbf24" : "#fb7185"
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative size-24">
                <svg viewBox="0 0 36 36" className="size-24 -rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${value} 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{value}</span>
            </div>
            <span className="text-xs text-muted">{label}</span>
        </div>
    )
}

export default function InsightsPanel ({ data, pages, keywords, jobDescription, onOpenTailor }: Props) {
    const checks = runChecks(data, pages)
    const quality = qualityScore(checks)
    const coverage = keywordCoverage(data, keywords)
    const overall = coverage.percent === null ? quality : Math.round(coverage.percent * 0.6 + quality * 0.4)
    const grouped = (["error", "warning", "tip"] as const).map(level => ({ level, items: checks.filter(check => check.level === level) }))

    return (
        <div>
            <PanelHeading title="Insights" subtitle="ATS-style checks. Runs on your device; no AI credits used." />

            <div className="flex flex-wrap items-center justify-around gap-6 rounded-xl border border-white/6 bg-white/2 p-5">
                <Ring value={overall} label="Overall" />
                <Ring value={quality} label="Content quality" />
                {coverage.percent !== null ? <Ring value={coverage.percent} label="Keyword match" /> : (
                    <div className="max-w-52 text-center">
                        <p className="text-sm font-semibold">No job keywords yet</p>
                        <p className="mt-1 text-xs text-muted">Paste a job description in Tailor to see your keyword match.</p>
                        <button type="button" onClick={onOpenTailor} className={`${ghostButton} mt-3`}><LuWandSparkles aria-hidden="true" /> Open Tailor</button>
                    </div>
                )}
            </div>

            {coverage.percent !== null && (
                <div className="mt-6">
                    <h3 className="text-sm font-bold">Keywords from the job{jobDescription ? "" : " (job description cleared)"}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {coverage.matched.map(keyword => <span key={keyword.keyword} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">✓ {keyword.keyword}</span>)}
                        {coverage.missing.map(keyword => (
                            <span key={keyword.keyword} className={`rounded-full px-3 py-1 text-xs font-semibold ${keyword.importance === "high" ? "bg-rose-500/15 text-rose-200" : "bg-white/6 text-muted"}`}>+ {keyword.keyword}</span>
                        ))}
                    </div>
                    {coverage.missing.length > 0 && <p className="mt-2 text-xs text-dim">Add missing keywords only where they&apos;re true for you, in skills or bullets.</p>}
                </div>
            )}

            <div className="mt-8 flex flex-col gap-6">
                {checks.length === 0 && <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-100">Everything looks good. Nice work.</p>}
                {grouped.filter(group => group.items.length).map(group => {
                    const { icon: Icon, className, label } = LEVEL[group.level]
                    return (
                        <div key={group.level}>
                            <h3 className={`text-xs font-bold tracking-wider uppercase ${className}`}>{label} ({group.items.length})</h3>
                            <ul className="mt-2 flex flex-col gap-2">
                                {group.items.map((check: Check) => (
                                    <li key={check.id} className="flex gap-3 rounded-lg border border-white/6 bg-white/2 p-3 text-sm leading-relaxed">
                                        <Icon className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true" />
                                        {check.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
            {pages === 0 && <p className="mt-6 text-xs text-dim">Open the preview to include page count checks.</p>}
        </div>
    )
}
