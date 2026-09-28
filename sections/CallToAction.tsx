"use client"

import { motion } from "framer-motion"
import { FaArrowRight } from "react-icons/fa"

export default function CallToAction () {
    return (
        <section className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-24">
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl border border-white/6 bg-[#131320] px-6 py-14 text-center md:px-16 md:py-20"
            >
                <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#DE0EFF]/15 blur-[100px]" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#751CFF]/20 blur-[100px]" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />

                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">Got a project?</span>
                    <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight md:text-5xl md:leading-tight">
                        Let&rsquo;s create something <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">amazing together</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-muted leading-relaxed">
                        Have a product idea, a startup to launch, or a platform that needs love? I turn ambitious ideas into fast, beautiful, scalable web apps.
                    </p>
                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a href="/start-a-project" className="relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[50px] px-9 py-[18px] text-base font-semibold transition-all duration-300 ease-in-out active:scale-[0.96] [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1 bg-linear-65/srgb from-accent-1 to-accent-2 text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(222,14,255,0.4)] after:absolute after:top-0 after:-left-full after:h-full after:w-1/2 after:-skew-x-20 after:bg-linear-to-r after:from-transparent after:via-white/25 after:to-transparent after:content-[''] hover:after:animate-shine">
                            Let&rsquo;s Work
                            <FaArrowRight />
                        </a>
                        <a href="#" className="relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[50px] px-9 py-[18px] text-base font-semibold transition-all duration-300 ease-in-out active:scale-[0.96] [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1 border border-white/12 bg-[rgba(81,44,111,0.4)] text-fg uppercase tracking-[1px] backdrop-blur-md hover:border-accent-1 hover:bg-accent-1/6 hover:text-white">
                            Download CV
                        </a>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}