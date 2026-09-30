"use client"

import { LuChartColumn, LuCircleCheck, LuCircleDashed } from "react-icons/lu"
import { PanelHeading, ghostButton } from "@/components/resume/controls"
import type { Selection } from "@/components/resume/EditorPanel"
import { qualityScore, runChecks } from "@/lib/resume/insights"
import { visibleSections } from "@/lib/resume/normalize"
import type { ResumeData } from "@/lib/resume/schema"

export default function FinishPanel ({ data, pages, onGo, onInsights }: { data: ResumeData, pages: number, onGo: (selection: Selection) => void, onInsights: () => void }) {
    const sections = visibleSections(data)
    const checks = runChecks(data, pages)
    const errors = checks.filter(check => check.level === "error")

    const steps: { label: string, done: boolean, go: Selection }[] = [
        { label: "Contact details", done: Boolean(data.contact.fullName.trim() && data.contact.email.trim()), go: "contact" },
        ...data.sections.map(section => ({
            label: section.title,
            done: sections.some(entry => entry.id === section.id),
            go: `section:${section.id}` as Selection,
        })),
        { label: "Design", done: true, go: "design" },
    ]

    return (
        <div>
            <PanelHeading title="Finish up & preview" subtitle={`Quality score ${qualityScore(checks)}/100${pages ? ` · ${pages} page${pages === 1 ? "" : "s"}` : ""}`} action={<button type="button" onClick={onInsights} className={ghostButton}><LuChartColumn aria-hidden="true" /> All insights</button>} />
            <ul className="flex flex-col gap-2">
                {steps.map(step => (
                    <li key={step.go}>
                        <button type="button" onClick={() => onGo(step.go)} className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-white/6 bg-white/2 px-4 text-left text-sm hover:border-accent-1">
                            {step.done ? <LuCircleCheck className="shrink-0 text-emerald-300" aria-hidden="true" /> : <LuCircleDashed className="shrink-0 text-dim" aria-hidden="true" />}
                            <span className="flex-1">{step.label}</span>
                            <span className="text-xs text-muted">{step.done ? "Ready" : "Empty or hidden"}</span>
                        </button>
                    </li>
                ))}
            </ul>
            {errors.length > 0 && (
                <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                    <p className="font-semibold">Before you send it:</p>
                    <ul className="mt-2 list-disc pl-5">{errors.map(check => <li key={check.id}>{check.message}</li>)}</ul>
                </div>
            )}
            <p className="mt-6 text-sm text-muted">Use the <strong className="text-fg">PDF</strong> button on the preview to download. The file has real, selectable text that ATS systems can read.</p>
        </div>
    )
}
