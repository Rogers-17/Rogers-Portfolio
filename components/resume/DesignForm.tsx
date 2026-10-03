"use client"

import { LuCheck } from "react-icons/lu"
import { PanelHeading, labelClass } from "@/components/resume/controls"
import { DENSITIES, PAPERS, TEMPLATES, TEMPLATE_INFO, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

type Props = {
    template: TemplateKey
    design: ResumeDesign
    onTemplate: (template: TemplateKey) => void
    onDesign: (design: ResumeDesign) => void
}

// Miniature layout sketches so templates are recognisable at a glance.
export function Thumb ({ template, accent }: { template: TemplateKey, accent: string }) {
    const line = (width: string, color = "#d7d7dc") => <span className="block h-1 rounded-sm" style={{ width, backgroundColor: color }} />
    return (
        <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-white p-2">
            {template === "sidebar" ? (
                <div className="flex h-full gap-1.5">
                    <div className="flex w-1/3 flex-col items-center gap-1 rounded-sm p-1" style={{ backgroundColor: accent }}>
                        <span className="size-5 rounded-full bg-white/80" />
                        {line("80%", "#ffffff99")}{line("60%", "#ffffff99")}{line("70%", "#ffffff99")}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 pt-1">{line("70%", accent)}{line("100%", accent)}{line("90%")}{line("85%")}{line("100%", accent)}{line("95%")}{line("80%")}</div>
                </div>
            ) : template === "timeline" ? (
                <div className="flex h-full flex-col gap-1">
                    {line("65%", accent)}{line("40%")}<span className="my-0.5 block h-px bg-slate-400" />
                    <div className="flex flex-1 gap-1.5">
                        <div className="flex w-1/3 flex-col gap-1">{line("90%", accent)}{line("80%")}{line("70%")}{line("90%", accent)}{line("75%")}</div>
                        <div className="flex flex-1 flex-col gap-1 border-l border-slate-300 pl-1.5">{line("80%", accent)}{line("100%")}{line("95%")}{line("80%", accent)}{line("100%")}{line("90%")}</div>
                    </div>
                </div>
            ) : template === "classic" ? (
                <div className="flex h-full flex-col items-center gap-1">
                    {line("60%", accent)}{line("40%")}<span className="my-0.5 block h-px w-full bg-slate-300" />
                    <div className="flex w-full flex-col gap-1">{line("35%", accent)}{line("100%")}{line("95%")}{line("35%", accent)}{line("100%")}{line("90%")}{line("35%", accent)}{line("80%")}</div>
                </div>
            ) : (
                <div className="flex h-full flex-col gap-1">
                    <div className="flex gap-1.5">
                        <span className="h-7 w-6 rounded-sm bg-slate-300" />
                        <div className="flex flex-1 flex-col gap-1 pt-0.5">{line("80%", accent)}{line("60%", "#b8912b")}{line("70%")}{line("65%")}</div>
                    </div>
                    {line("45%", accent)}<span className="block h-px bg-[#b8912b]" />{line("100%")}{line("95%")}{line("45%", accent)}<span className="block h-px bg-[#b8912b]" />{line("100%")}{line("90%")}
                </div>
            )}
        </div>
    )
}

export default function DesignForm ({ template, design, onTemplate, onDesign }: Props) {
    const accents = TEMPLATE_INFO[template].accents
    const accent = design.accent ?? accents[0]

    return (
        <div>
            <PanelHeading title="Design" subtitle="Template, colour, spacing and paper size" />

            <p className={labelClass}>Template</p>
            <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
                {TEMPLATES.map(key => {
                    const active = key === template
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => { onTemplate(key); onDesign({ ...design, accent: null }) }}
                            className={`rounded-xl border p-2 text-left transition-colors ${active ? "border-accent-1 bg-accent-1/8" : "border-white/8 bg-white/2 hover:border-white/25"}`}
                        >
                            <Thumb template={key} accent={TEMPLATE_INFO[key].accents[0]} />
                            <p className="mt-2 text-sm font-semibold">{TEMPLATE_INFO[key].label}</p>
                            <p className="text-[11px] leading-snug text-muted">{TEMPLATE_INFO[key].description}</p>
                        </button>
                    )
                })}
            </div>

            <p className={`${labelClass} mt-8`}>Accent colour</p>
            <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Accent colour">
                {accents.map(color => (
                    <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={accent === color}
                        aria-label={color}
                        onClick={() => onDesign({ ...design, accent: color === accents[0] ? null : color })}
                        className={`inline-flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow ${accent === color ? "ring-2 ring-accent-1" : "ring-1 ring-white/10"}`}
                        style={{ backgroundColor: color }}
                    >
                        {accent === color && <LuCheck className="text-white" aria-hidden="true" />}
                    </button>
                ))}
            </div>

            <div className="mt-8 grid gap-6 @2xl:grid-cols-3">
                <fieldset>
                    <legend className={labelClass}>Density</legend>
                    <div className="mt-3 flex rounded-lg border border-white/10 p-1">
                        {DENSITIES.map(density => (
                            <button key={density} type="button" aria-pressed={design.density === density} onClick={() => onDesign({ ...design, density })} className={`min-h-9 flex-1 rounded-md text-sm font-semibold capitalize ${design.density === density ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}>
                                {density}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className={labelClass}>Paper</legend>
                    <div className="mt-3 flex rounded-lg border border-white/10 p-1">
                        {PAPERS.map(paper => (
                            <button key={paper} type="button" aria-pressed={design.paper === paper} onClick={() => onDesign({ ...design, paper })} className={`min-h-9 flex-1 rounded-md text-sm font-semibold ${design.paper === paper ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}>
                                {paper === "A4" ? "A4" : "US Letter"}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className={labelClass}>Photo</legend>
                    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 px-3 text-sm">
                        <input type="checkbox" checked={design.showPhoto} onChange={event => onDesign({ ...design, showPhoto: event.target.checked })} className="size-4 accent-accent-1" />
                        Show photo
                    </label>
                </fieldset>
            </div>
        </div>
    )
}
