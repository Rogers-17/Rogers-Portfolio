"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { formatDuration, type ExperiencePublic } from "@/lib/content/schema"

const container = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.12 },
    },
}

const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

export default function ExperienceTimeline ({ experiences }: { experiences: ExperiencePublic[] }) {
    if (experiences.length === 0) {
        return <p className="mt-10 text-muted md:mt-16">Experience coming soon.</p>
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative mt-10 md:mt-16 flex flex-col gap-6 md:gap-8"
        >
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-[#DE0EFF]/60 via-white/10 to-transparent md:left-[7px]" aria-hidden="true" />
            {experiences.map(entry => {
                const duration = formatDuration(entry.dates)
                const company = (
                    <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">{entry.company}</span>
                )

                return (
                    <motion.div key={entry.id} variants={item} className="relative pl-8 md:pl-12">
                        <span className="absolute left-0 top-7 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#DE0EFF] to-[#751CFF] ring-4 ring-white/5 md:h-3.5 md:w-3.5" aria-hidden="true" />
                        <article className="rounded-2xl bg-white/4 border border-white/6 p-6 md:p-8
                        transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]
                        will-change-transform hover:-translate-y-1 hover:bg-white/8 hover:border-white/15">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-xl md:text-2xl font-bold">{entry.role}</h3>
                                <span className="rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-semibold text-muted">
                                    {entry.period}{duration && <span className="text-dim"> · {duration}</span>}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                                {entry.logoUrl && (
                                    <Image src={entry.logoUrl} alt="" width={32} height={32} className="size-8 rounded-md object-contain" />
                                )}
                                {entry.companyUrl ? (
                                    <a href={entry.companyUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{company}</a>
                                ) : company}
                                {entry.location && <span className="text-sm font-normal text-muted">· {entry.location}</span>}
                            </div>
                            {entry.description && <p className="mt-4 text-sm leading-relaxed text-muted">{entry.description}</p>}
                            {entry.skills.length > 0 && (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {entry.skills.map(skill => (
                                        <span key={skill} className="rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-medium text-muted">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </motion.div>
                )
            })}
        </motion.div>
    )
}
