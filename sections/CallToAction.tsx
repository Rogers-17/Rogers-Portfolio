"use client"

import { motion } from "framer-motion"
import { FaArrowRight } from "react-icons/fa"

export default function CallToAction () {
    return (
        <section className="main py-14 md:py-24">
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
                    <span className="grad-badge">Got a project?</span>
                    <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight md:text-5xl md:leading-tight">
                        Let&rsquo;s create something <span className="grad-text">amazing together</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-muted leading-relaxed">
                        Have a product idea, a startup to launch, or a platform that needs love? I turn ambitious ideas into fast, beautiful, scalable web apps.
                    </p>
                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a href="/start-a-project" className="btn btn-primary btn-lg">
                            Let&rsquo;s Work
                            <FaArrowRight />
                        </a>
                        <a href="#" className="btn btn-outline btn-lg">
                            Download CV
                        </a>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}