import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { FaArrowRight } from "react-icons/fa"
import { LuCode, LuPenTool, LuSparkles } from "react-icons/lu"
import Portrait from "@/assets/images/hero-image.png"
import PageHeader from "@/components/ui/PageHeader"
import CallToAction from "@/sections/CallToAction"
import Experience from "@/sections/Experience"
import LogoTicker from "@/sections/LogoTicker"
import Testimonials from "@/sections/Testimonials"
import { aboutChips, aboutHighlights, aboutIntro, aboutServices } from "@/utils/content/about"

export const metadata: Metadata = {
    title: "About | Rogers Portfolio",
    description: "Full-stack designer harnessing AI, design, and code for startups and financial institutions.",
}

const serviceIcons = [LuPenTool, LuCode, LuSparkles]

export default function AboutPage () {
    return (
        <>
            <main className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
                <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
                    <div className="lg:w-3/5">
                        <PageHeader badge={aboutIntro.badge} title={aboutIntro.title} highlight={aboutIntro.highlight} />
                        <div className="mt-6 flex flex-col gap-5 text-lg leading-[1.85] text-muted">
                            {aboutIntro.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                        </div>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/start-a-project" className="group inline-flex items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(222,14,255,0.3)] transition-all duration-300 hover:-translate-y-0.5">
                                Start a project
                                <FaArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                            <Link href="/projects" className="inline-flex items-center rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:border-accent-1">
                                View my work
                            </Link>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-sm lg:w-2/5 lg:max-w-none">
                        <div className="pointer-events-none absolute inset-6 rounded-full bg-accent-1/25 blur-[90px]" aria-hidden="true" />
                        <div className="relative rounded-3xl bg-linear-65/srgb from-accent-1 to-accent-2 p-[2px]">
                            <div className="overflow-hidden rounded-[22px] bg-card">
                                <Image src={Portrait} alt="Portrait of Rogers" priority sizes="(min-width: 1200px) 400px, 384px" className="h-auto w-full" />
                            </div>
                        </div>
                        {aboutChips.map((chip, index) => (
                            <span
                                key={chip}
                                className={`absolute rounded-full border border-white/10 bg-[#140b22]/90 px-4 py-2 text-sm font-semibold shadow-xl backdrop-blur ${index === 0 ? "-top-3 -left-2 md:-left-6" : "-right-2 -bottom-3 md:-right-6"}`}
                            >
                                {chip}
                            </span>
                        ))}
                    </div>
                </div>

                <ul className="mt-16 grid grid-cols-2 gap-4 md:mt-24 lg:grid-cols-4">
                    {aboutHighlights.map(highlight => (
                        <li key={highlight.label} className="rounded-2xl border border-white/6 bg-white/4 p-5 md:p-6">
                            <p className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">{highlight.value}</p>
                            <p className="mt-2 text-sm text-muted">{highlight.label}</p>
                        </li>
                    ))}
                </ul>

                <section id="services" className="mt-16 scroll-mt-24 md:mt-24" aria-labelledby="services-heading">
                    <h2 id="services-heading" className="text-3xl font-bold md:text-4xl">
                        What I do. <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">Services.</span>
                    </h2>
                    <ul className="mt-8 grid gap-5 md:mt-10 md:grid-cols-3">
                        {aboutServices.map((service, index) => {
                            const Icon = serviceIcons[index]
                            return (
                                <li key={service.title} className="rounded-2xl border border-white/6 bg-white/4 p-6 md:p-7">
                                    <span className="inline-flex size-12 items-center justify-center rounded-xl bg-linear-65/srgb from-accent-1 to-accent-2 text-xl text-white">
                                        <Icon aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-5 text-xl font-bold">{service.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <h2 className="mt-16 mb-8 text-3xl font-bold md:mt-24 md:text-4xl">
                    My toolbox. <br />
                    <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">Tools I build with.</span>
                </h2>
            </main>

            <LogoTicker />
            <Experience />
            <Testimonials />
            <CallToAction />
        </>
    )
}
