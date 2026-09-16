"use client"

import { motion } from "framer-motion"
import { experience } from "@/utils/data"

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

export default function Experience () {
    return (
        <section className="main py-14 md:py-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
                <div>
                    <h2 className="grad-badge">Experience</h2>
                    <p className="text-3xl md:text-4xl mt-3 md:mt-5 font-bold">My journey <br />
                        <span className="grad-text">So far</span>
                    </p>
                </div>
                <p className="max-w-md text-muted leading-relaxed">
                    Years of pairing design thinking with clean, scalable code across fintech, SaaS, and startups.
                </p>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="relative mt-10 md:mt-16 flex flex-col gap-6 md:gap-8"
            >
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-[#DE0EFF]/60 via-white/10 to-transparent md:left-[7px]" aria-hidden="true" />
                {experience.map(entry => (
                    <motion.div key={entry.role} variants={item} className="relative pl-8 md:pl-12">
                        <span className="absolute left-0 top-7 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#DE0EFF] to-[#751CFF] ring-4 ring-white/5 md:h-3.5 md:w-3.5" aria-hidden="true" />
                        <article className="rounded-2xl bg-white/4 border border-white/6 p-6 md:p-8
                        transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]
                        will-change-transform hover:-translate-y-1 hover:bg-white/8 hover:border-white/15">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-xl md:text-2xl font-bold">{entry.role}</h3>
                                <span className="rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-semibold text-muted">
                                    {entry.period}
                                </span>
                            </div>
                            <div className="mt-1 font-semibold grad-text">{entry.company}</div>
                            <p className="mt-4 text-sm leading-relaxed text-muted">{entry.description}</p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {entry.stack.map(tech => (
                                    <span key={tech} className="rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-medium text-muted">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </article>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    )
}