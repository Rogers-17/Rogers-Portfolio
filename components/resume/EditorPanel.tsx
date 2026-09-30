"use client"

import * as React from "react"
import Link from "next/link"
import { LuChartColumn, LuChevronLeft, LuEye, LuEyeOff, LuLayoutGrid, LuPalette, LuPlus, LuSparkles, LuUser, LuWandSparkles } from "react-icons/lu"
import { SECTION_ICONS } from "@/components/resume/fields"
import { SortableList, SortableRow } from "@/components/resume/Sortable"
import { useAi, type AiUsage } from "@/components/resume/ai/context"
import { SECTION_LABELS, SECTION_TYPES, type ResumeSection, type SectionType } from "@/lib/resume/schema"

export type Tab = "sections" | "insights" | "tailor"
export type Selection = "copilot" | "contact" | "design" | "finish" | `section:${string}`

type Props = {
    title: string
    targetRole: string
    tab: Tab
    onTab: (tab: Tab) => void
    selected: Selection
    onSelect: (selection: Selection) => void
    sections: ResumeSection[]
    onSections: (sections: ResumeSection[]) => void
    onAddSection: (type: SectionType) => void
    usage: AiUsage | null
}

const itemClass = (active: boolean) =>
    `relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${active ? "bg-accent-1/10 font-semibold text-white" : "text-fg/80 hover:bg-white/4 hover:text-white"}`

function ActiveBar () {
    return <span className="absolute inset-y-1.5 left-0 w-0.75 rounded-full bg-linear-to-b from-accent-1 to-accent-2" aria-hidden="true" />
}

export default function EditorPanel ({ title, targetRole, tab, onTab, selected, onSelect, sections, onSections, onAddSection, usage: initialUsage }: Props) {
    const [adding, setAdding] = React.useState(false)
    // Live usage from the AI context (updates after every AI call).
    const usage = useAi()?.usage ?? initialUsage

    const tabs: { key: Tab, label: string, icon: typeof LuLayoutGrid }[] = [
        { key: "sections", label: "Sections", icon: LuLayoutGrid },
        { key: "insights", label: "Insights", icon: LuChartColumn },
        { key: "tailor", label: "Tailor", icon: LuWandSparkles },
    ]

    return (
        <aside className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-card p-3 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            <div className="px-1">
                <Link href="/admin/resumes" className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted hover:text-white">
                    <LuChevronLeft aria-hidden="true" /> Back
                </Link>
                <p className="mt-2 truncate text-sm font-bold" title={title}>{title}</p>
                {targetRole && <p className="truncate text-xs text-muted">{targetRole}</p>}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 bg-surface p-1" role="tablist" aria-label="Editor tools">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => onTab(key)}
                        className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${tab === key ? "bg-white text-surface" : "text-muted hover:text-white"}`}
                    >
                        <Icon aria-hidden="true" /> {label}
                    </button>
                ))}
            </div>

            {tab === "sections" && (
                <nav aria-label="Resume sections" className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => onSelect("copilot")} className={itemClass(selected === "copilot")}>
                        {selected === "copilot" && <ActiveBar />}
                        <LuSparkles className="shrink-0 text-accent-1" aria-hidden="true" />
                        <span className="flex-1">Ask Copilot</span>
                        <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted">BETA</span>
                    </button>
                    <button type="button" onClick={() => onSelect("contact")} className={itemClass(selected === "contact")}>
                        {selected === "contact" && <ActiveBar />}
                        <LuUser className="shrink-0" aria-hidden="true" />
                        Contact
                    </button>

                    <SortableList items={sections} onReorder={onSections}>
                        {sections.map(section => {
                            const Icon = SECTION_ICONS[section.type]
                            const key: Selection = `section:${section.id}`
                            const active = selected === key
                            return (
                                <SortableRow key={section.id} id={section.id} label={section.title} className="flex items-center">
                                    {({ handle }) => (
                                        <>
                                            {handle}
                                            <button type="button" onClick={() => onSelect(key)} className={`${itemClass(active)} min-w-0 flex-1 pl-2`}>
                                                {active && <ActiveBar />}
                                                <Icon className="shrink-0" aria-hidden="true" />
                                                <span className={`truncate ${section.visible ? "" : "text-dim line-through"}`}>{section.title || SECTION_LABELS[section.type]}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSections(sections.map(entry => (entry.id === section.id ? { ...entry, visible: !entry.visible } : entry)))}
                                                aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`}
                                                title={section.visible ? "Hide from PDF" : "Show in PDF"}
                                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-dim hover:bg-white/6 hover:text-white"
                                            >
                                                {section.visible ? <LuEye aria-hidden="true" /> : <LuEyeOff aria-hidden="true" />}
                                            </button>
                                        </>
                                    )}
                                </SortableRow>
                            )
                        })}
                    </SortableList>

                    <div className="relative">
                        <button type="button" onClick={() => setAdding(current => !current)} aria-expanded={adding} className={itemClass(false)}>
                            <LuPlus className="shrink-0" aria-hidden="true" /> Add section
                        </button>
                        {adding && (
                            <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-white/8 bg-surface p-1.5">
                                {SECTION_TYPES.map(type => {
                                    const Icon = SECTION_ICONS[type]
                                    return (
                                        <button key={type} type="button" onClick={() => { onAddSection(type); setAdding(false) }} className="flex min-h-9 items-center gap-2 rounded-md px-2 text-left text-xs text-fg/85 hover:bg-white/6 hover:text-white">
                                            <Icon className="shrink-0" aria-hidden="true" /> {SECTION_LABELS[type]}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <button type="button" onClick={() => onSelect("design")} className={itemClass(selected === "design")}>
                        {selected === "design" && <ActiveBar />}
                        <LuPalette className="shrink-0" aria-hidden="true" /> Design
                    </button>
                    <button type="button" onClick={() => onSelect("finish")} className={itemClass(selected === "finish")}>
                        {selected === "finish" && <ActiveBar />}
                        <LuEye className="shrink-0" aria-hidden="true" /> Finish up &amp; preview
                    </button>
                </nav>
            )}

            {usage && (
                <div className="mt-auto rounded-xl border border-white/6 bg-surface p-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted uppercase">
                        <span className="inline-flex items-center gap-1.5"><LuSparkles className="text-accent-1" aria-hidden="true" /> AI today</span>
                        <span className="text-white">{Math.max(0, usage.limit - usage.used)}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-linear-65/srgb from-accent-1 to-accent-2" style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] text-dim">{Math.max(0, usage.limit - usage.used)} of {usage.limit} generations left today · {usage.model}</p>
                </div>
            )}
        </aside>
    )
}
