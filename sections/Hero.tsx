"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { TypeAnimation } from "react-type-animation"
import MainImage from '@/assets/images/hero-image.png'
import OutLineImage from '@/assets/images/hero-image-outline-main.png'

const rotatingWords = [
  'Magic',
  1800,
  'Websites',
  1800,
  'Designs',
  1800,
  'Systems',
  1800,
  'Web Apps',
  1800,
]

export default function Hero () {
    return (
        <section className="flex min-h-[calc(100vh-72px)] items-center justify-center px-5 pt-20 pb-16 text-center">
            <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center gap-10 px-5 md:gap-14 md:px-8 bg-[url(/img/hero-bg.png)] bg-cover bg-center bg-no-repeat">
                <motion.span className="inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                  Yo! Whats Up? 👋🏽
                </motion.span>

                <motion.h1 className="m-0 max-w-[960px] text-[clamp(2.25rem,8vw,3.6rem)] font-extrabold leading-[1.02] md:text-[clamp(2.5rem,5vw,5rem)]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}>
                    Let&apos;s create&nbsp;
                    <span className="inline-block bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">
                      <TypeAnimation sequence={rotatingWords} wrapper="span" cursor={true} repeat={Infinity} style={{display: 'inline-block'}} speed={60} />
                    </span>
                    <br />together
                </motion.h1>

                <motion.div className="relative z-1 mx-auto flex w-full max-w-[860px] items-center justify-center" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.22 }}>
                    <div className="relative mx-auto inline-flex w-[min(100%,560px)] max-w-[560px] items-center justify-center">
                        <Image src={MainImage} className="z-2 block h-auto w-full rounded-[1.25rem] drop-shadow-[0_24px_64px_rgba(0,0,0,0.35)]" alt="Hero Image" width={840} height={840} />
                        <Image src={OutLineImage} alt="Rogers - Full-stack Developer" className="pointer-events-none absolute inset-0 z-1 h-full w-full object-contain transform-gpu" width={880} height={880} />
                        <div className="pointer-events-none absolute inset-0 z-3 before:absolute before:inset-0 before:opacity-25 before:content-[''] before:bg-[repeating-linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08)_2px,transparent_2px,transparent_4px)]"></div>
                    </div>
                </motion.div>

                <motion.div className="relative z-3 mx-auto mt-0 flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-6 px-6 pb-5 md:-mt-[60px] md:px-8 md:pb-0" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.32 }}>
                <div className="flex w-full max-w-[720px] flex-col items-center gap-4 text-center">
                    <p className="m-0 w-full text-base leading-[1.75] text-muted">Full-Stack Designer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions.</p>
                    <a href="#" target="_blank" rel="noopener" download className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-[#a2a2a2] no-underline transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 512 512" fill="currentColor"><path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5 12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg>
                    Corporate Profile
                    </a>
                </div>
                <a href="start-a-project/" className="flex justify-center items-center gap-2 bg-purple-500 py-3 px-4 rounded-full w-full md:w-auto">
                    <span className="font-semibold">LET&apos;S WORK</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 17 17" fill="none"><path d="M9.1497 0.80204C9.26529 3.95101 13.2299 6.51557 16.1451 8.0308L16.1447 9.43036C13.2285 10.7142 9.37889 13.1647 9.37789 16.1971L7.27855 16.1978C7.16304 12.8156 10.6627 10.4818 13.1122 9.66462L0.049716 9.43565L0.0504065 7.33631L13.1129 7.56528C10.5473 6.86634 6.93261 4.18504 7.05036 0.80273L9.1497 0.80204Z" fill="currentColor"/></svg>
                </a>
                </motion.div>


            </div>
        </section>
    )
}
