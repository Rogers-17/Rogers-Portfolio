"use client"

import { motion } from "framer-motion"
import { FaQuoteLeft, FaStar } from "react-icons/fa"
import { testimonials } from "@/utils/data"

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

export default function Testimonials () {
    return (
        <section className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
                <div>
                    <h2 className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]">Testimonials</h2>
                    <p className="text-3xl md:text-4xl mt-3 md:mt-5 font-bold">What people say <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">About working with me</span>
                    </p>
                </div>
                <p className="max-w-md text-muted leading-relaxed">
                    Startups and financial institutions across the globe trust my process — here is what a few of them had to say.
                </p>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 md:mt-16"
            >
                {testimonials.map(testimonial => (
                    <motion.figure
                        key={testimonial.name}
                        variants={item}
                        className="group relative flex flex-col gap-5 rounded-2xl p-6 md:p-7 bg-white/4 border border-white/6
                        transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]
                        will-change-transform hover:-translate-y-2 hover:bg-white/8 hover:border-white/15"
                    >
                        <div className="flex items-center justify-between">
                            <FaQuoteLeft className="text-2xl" />
                            <div className="flex gap-1 text-sm text-[#F505FF]">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <FaStar key={i} />
                                ))}
                            </div>
                        </div>

                        <blockquote className="text-sm leading-relaxed text-muted md:text-base">
                            &ldquo;{testimonial.quote}&rdquo;
                        </blockquote>

                        <figcaption className="mt-auto flex items-center gap-3 pt-4 border-t border-white/6">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#DE0EFF] to-[#751CFF] text-sm font-bold text-white">
                                {testimonial.initials}
                            </span>
                            <div className="min-w-0">
                                <div className="truncate font-semibold">{testimonial.name}</div>
                                <div className="truncate text-sm text-muted">{testimonial.role}</div>
                            </div>
                        </figcaption>
                    </motion.figure>
                ))}
            </motion.div>
        </section>
    )
}