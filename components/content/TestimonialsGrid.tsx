"use client"

import { motion } from "framer-motion"
import { FaQuoteLeft, FaStar } from "react-icons/fa"
import Image from "next/image"
import type { TestimonialPublic } from "@/lib/content/schema"

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

export default function TestimonialsGrid ({ testimonials }: { testimonials: TestimonialPublic[] }) {
    if (testimonials.length === 0) {
        return <p className="mt-10 text-muted md:mt-16">Testimonials coming soon.</p>
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 md:mt-16"
        >
            {testimonials.map(testimonial => (
                <motion.figure
                    key={testimonial.id}
                    variants={item}
                    className="group relative flex flex-col gap-5 rounded-2xl p-6 md:p-7 bg-white/4 border border-white/6
                    transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]
                    will-change-transform hover:-translate-y-2 hover:bg-white/8 hover:border-white/15"
                >
                    <div className="flex items-center justify-between">
                        <FaQuoteLeft className="text-2xl" />
                        {testimonial.rating && (
                            <div className="flex gap-1 text-sm text-[#F505FF]" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <FaStar key={i} aria-hidden="true" />
                                ))}
                            </div>
                        )}
                    </div>

                    <blockquote className="text-sm leading-relaxed text-muted md:text-base">
                        &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>

                    <figcaption className="mt-auto flex items-center gap-3 pt-4 border-t border-white/6">
                        {testimonial.avatarUrl ? (
                            <Image src={testimonial.avatarUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                        ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#DE0EFF] to-[#751CFF] text-sm font-bold text-white">
                                {testimonial.initials}
                            </span>
                        )}
                        <div className="min-w-0">
                            <div className="truncate font-semibold">{testimonial.name}</div>
                            {testimonial.role && <div className="truncate text-sm text-muted">{testimonial.role}</div>}
                        </div>
                    </figcaption>
                </motion.figure>
            ))}
        </motion.div>
    )
}
