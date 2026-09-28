"use client"

import { motion } from "framer-motion"
import { FaArrowRight } from "react-icons/fa"
import { projects } from "@/utils/data"

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

export default function Project () {
    return (
        <section className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
                <div>
                    <h1 className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">My Works</h1>
                    <p className="text-3xl md:text-4xl mt-3 md:mt-5 font-bold">Projects I worked on. <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">At a glance</span>
                    </p>
                </div>
                <a href="/start-a-project" className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted transition-colors duration-300 hover:text-white">
                    View All Projects
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 17 17" fill="none" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M9.1497 0.80204C9.26529 3.95101 13.2299 6.51557 16.1451 8.0308L16.1447 9.43036C13.2285 10.7142 9.37889 13.1647 9.37789 16.1971L7.27855 16.1978C7.16304 12.8156 10.6627 10.4818 13.1122 9.66462L0.049716 9.43565L0.0504065 7.33631L13.1129 7.56528C10.5473 6.86634 6.93261 4.18504 7.05036 0.80273L9.1497 0.80204Z" fill="currentColor"/></svg>
                </a>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 md:mt-16"
            >
                {projects.map((project, index) => (
                    <motion.article
                        key={project.title}
                        variants={item}
                        className="group relative flex flex-col gap-6 rounded-2xl p-5 md:p-6 bg-white/4 border border-white/6
                        transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]
                        will-change-transform hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/8 hover:border-white/15"
                    >
                        <div className="relative overflow-hidden rounded-xl aspect-[4/3] border border-white/6 bg-[#131320]">
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: `radial-gradient(120% 120% at 15% 0%, ${project.accent[0]}26, transparent 60%), radial-gradient(120% 120% at 90% 100%, ${project.accent[1]}33, transparent 55%)`,
                                }}
                            />
                            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
                            <span className="absolute top-4 left-4 text-sm font-bold uppercase tracking-[0.2em] bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="absolute top-4 right-4 rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-semibold text-muted backdrop-blur-sm">
                                {project.year}
                            </span>
                            <span className="absolute bottom-4 left-4 text-lg font-extrabold uppercase tracking-wide">
                                {project.tags[0]}
                            </span>
                            <div className="absolute inset-0 rounded-xl ring-0 ring-white/0 transition-all duration-500 group-hover:ring-1 group-hover:ring-white/10" />
                        </div>

                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl md:text-2xl font-bold leading-snug">{project.title}</h2>
                            <p className="text-sm text-muted leading-relaxed">{project.description}</p>

                            <div className="flex flex-wrap gap-2">
                                {project.tags.map(tag => (
                                    <span key={tag} className="rounded-full border border-white/6 bg-white/4 px-3 py-1 text-xs font-medium text-muted">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-4 pt-1">
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-dim">
                                    {project.stack.map(tech => (
                                        <span key={tech}>{tech}</span>
                                    ))}
                                </div>
                                <a href={project.href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-purple-500 py-2 px-4 text-xs font-bold uppercase tracking-wide transition-all duration-300 hover:bg-purple-400">
                                    View
                                    <FaArrowRight size={10} />
                                </a>
                            </div>
                        </div>
                    </motion.article>
                ))}
            </motion.div>
        </section>
    )
}