"use client"
import Image from "next/image"
import { motion } from "framer-motion"
import { logos } from "@/utils/data"
import * as React from 'react'

export default function LogoTicker () {
    return (
            <section className="overflow-x-clip border-b border-white/8 pb-8" aria-label="Tech Stack">
                <div className="overflow-hidden flex mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                    <motion.div className="flex gap-8 pr-24 shrink-0 scrollbar-none overflow-x-auto"
                    animate={{
                        x: "-50%",
                    }}
                    transition={{
                        duration: 30,
                        ease: "linear",
                        repeat: Infinity,
                    }}>
                        {Array.from({ length: 4}).map((_, i) => (
                            <React.Fragment
                            key={i}
                            >
                                {logos.map(logo => (
                                    <div className="flex items-center justify-center w-24 h-24 
                                    rounded-2xl p-3.5 bg-white/4 border border-white/6 cursor-default transition-all duration-300
                                    [transition-timing-function:cubic-bezier(0.68, -0.55, 0.265, 1.55)]
                                    will-change-transform hover:translate-y-2 hover:scale-[1.15] hover:bg-white/8 hover:border-white/15"
                                     data-label="Figma">
                                        <Image src={logo.image}  alt={logo.name} key={logo.name} />
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                        
                    </motion.div>
                </div>
            </section>
    )
}