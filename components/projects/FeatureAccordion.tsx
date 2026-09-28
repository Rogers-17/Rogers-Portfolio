"use client"

import * as React from "react"
import Image from "next/image"
import { FiChevronDown } from "react-icons/fi"
import type { ProjectFeature } from "@/lib/projects/schema"

export default function FeatureAccordion ({ features }: { features: ProjectFeature[] }) {
    const [openId, setOpenId] = React.useState<string | null>(features[0]?.id ?? null)
    const baseId = React.useId()

    return (
        <div className="flex flex-col gap-3">
            {features.map(feature => {
                const isOpen = openId === feature.id
                const panelId = `${baseId}-${feature.id}`
                const hasContent = Boolean(feature.description || feature.imageUrl)

                return (
                    <div key={feature.id}>
                        <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => setOpenId(isOpen ? null : feature.id)}
                            className={`flex w-full items-center justify-between gap-4 rounded-full px-6 py-4 text-left font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${isOpen ? "bg-linear-65/srgb from-accent-1 to-accent-2" : "bg-[#4a2468] hover:bg-[#5a2c7e]"}`}
                        >
                            {feature.title}
                            <FiChevronDown className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>

                        <div
                            id={panelId}
                            role="region"
                            aria-label={feature.title}
                            className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-2 pt-5 pb-3">
                                    {feature.imageUrl && (
                                        <Image
                                            src={feature.imageUrl}
                                            alt={feature.imageAlt}
                                            width={1200}
                                            height={800}
                                            sizes="(min-width: 768px) 45vw, 90vw"
                                            className="mx-auto h-auto w-[90%] rounded-xl"
                                        />
                                    )}
                                    {feature.description && (
                                        <p className={`leading-relaxed text-muted ${feature.imageUrl ? "mt-4" : ""}`}>{feature.description}</p>
                                    )}
                                    {!hasContent && (
                                        <p className="text-sm text-muted">More details coming soon.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
