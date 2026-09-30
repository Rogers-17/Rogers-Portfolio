"use client"

import * as React from "react"
import { LuChevronDown } from "react-icons/lu"
import { Emphasis } from "@/components/ui/Paragraphs"
import { FACT_ICON_COMPONENTS } from "@/components/about/fact-icons"
import type { AboutFact } from "@/lib/pages/schema"

// One row open at a time; the first is open by default.
export default function FactsAccordion ({ facts }: { facts: AboutFact[] }) {
    const [openId, setOpenId] = React.useState<string | null>(facts[0]?.id ?? null)
    const baseId = React.useId()

    return (
        <ul className="flex flex-col gap-3">
            {facts.map(fact => {
                const Icon = FACT_ICON_COMPONENTS[fact.icon]
                const open = openId === fact.id
                const panelId = `${baseId}-${fact.id}`
                return (
                    <li key={fact.id}>
                        <h3>
                            <button
                                type="button"
                                aria-expanded={open}
                                aria-controls={panelId}
                                onClick={() => setOpenId(open ? null : fact.id)}
                                className={`flex min-h-11 w-full items-center gap-2.5 rounded-full px-4 text-left text-sm font-semibold text-white transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${open ? "bg-linear-65/srgb from-accent-1 to-accent-2 shadow-[0_6px_24px_rgba(222,14,255,0.3)]" : "bg-[#3a2359] hover:bg-[#46296c]"}`}
                            >
                                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                                <span className="flex-1">{fact.title}</span>
                                <LuChevronDown className={`size-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                            </button>
                        </h3>
                        <div id={panelId} role="region" aria-label={fact.title} inert={!open} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                            <div className="overflow-hidden">
                                <p className="px-4 pt-3 pb-2 text-sm leading-relaxed text-muted"><Emphasis text={fact.body} /></p>
                            </div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
