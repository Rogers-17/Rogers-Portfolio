import type { Metadata } from "next"
import Image from "next/image"
import Portrait from "@/assets/images/hero-image.png"
import CodeWindow from "@/components/about/CodeWindow"
import FactsAccordion from "@/components/about/FactsAccordion"
import TiltPhotos from "@/components/about/TiltPhotos"
import Badge from "@/components/ui/Badge"
import Paragraphs from "@/components/ui/Paragraphs"
import { getAboutContent } from "@/lib/pages/queries"
import LetsWorkCTA from "@/sections/LetsWorkCTA"
import JsonLd from "@/components/seo/JsonLd"
import { breadcrumbJsonLd, pageMetadata, profilePageJsonLd } from "@/lib/seo"
import { absoluteUrl } from "@/lib/site"

const DESCRIPTION = "About Mohammed N. Rogers, a full-stack software engineer based in Liberia: background, journey and approach to building web products."

export const metadata: Metadata = pageMetadata({ title: "About", description: DESCRIPTION, path: "/about" })

const container = "mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20"
const gradientText = "bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent"

export default async function AboutPage () {
    const { page, facts } = await getAboutContent()

    return (
        <main className="bg-surface">
            <JsonLd nodes={[
                profilePageJsonLd({ path: "/about", name: "About Mohammed N. Rogers", description: DESCRIPTION, imageUrl: page.photoPrimaryUrl ?? absoluteUrl(Portrait.src) }),
                breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]),
            ]} />
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute top-0 right-0 h-full w-full bg-[radial-gradient(45%_60%_at_78%_45%,rgba(117,28,255,0.22),transparent_70%)] lg:w-3/4" aria-hidden="true" />
                <div className={`${container} relative grid gap-12 pt-10 pb-16 md:pt-14 md:pb-24 lg:grid-cols-12 lg:items-center lg:gap-10`}>
                    <div className="lg:col-span-7">
                        <Badge>{page.badge}</Badge>
                        <h1 className="mt-5 text-3xl leading-tight font-bold md:text-4xl lg:text-[2.5rem]">
                            {page.title}
                            <br />
                            <span className={gradientText}>{page.highlight}</span>
                        </h1>
                        <Paragraphs text={page.intro} className="mt-5 max-w-136 text-[15px] leading-[1.8] text-muted md:text-base" />
                    </div>
                    <div className="lg:col-span-5">
                        <TiltPhotos
                            primary={{ src: page.photoPrimaryUrl ?? Portrait, alt: page.photo_alt }}
                            secondary={{ src: page.photoSecondaryUrl ?? Portrait, alt: page.photo_alt }}
                        />
                    </div>
                </div>
            </section>

            <CodeWindow imageUrl={page.backgroundUrl} />

            {/* Early life */}
            <section className={`${container} grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-12`} aria-labelledby="early-heading">
                <div className="lg:col-span-7">
                    <p className={`text-2xl font-bold md:text-3xl ${gradientText}`}>{page.early_eyebrow}</p>
                    <h2 id="early-heading" className="mt-1 text-lg font-bold md:text-xl">{page.early_title}</h2>
                    <Paragraphs text={page.early_body} className="mt-5 max-w-136 text-[15px] leading-[1.8] text-muted md:text-base" />
                </div>
                {facts.length > 0 && (
                    <div className="lg:col-span-5">
                        <FactsAccordion facts={facts} />
                    </div>
                )}
            </section>

            {/* Journey */}
            <section className={`${container} grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-12`} aria-labelledby="journey-heading">
                <div className="lg:col-span-5">
                    <div className="relative mx-auto aspect-4/5 w-full max-w-56 md:max-w-72 lg:max-w-80">
                        <div className="pointer-events-none absolute inset-[15%] rounded-full bg-accent-1/15 blur-[70px]" aria-hidden="true" />
                        <Image
                            src={page.journeyImageUrl ?? Portrait}
                            alt={page.journey_image_alt}
                            fill
                            sizes="(min-width: 1200px) 320px, (min-width: 768px) 288px, 224px"
                            className="object-contain"
                        />
                    </div>
                </div>
                <div className="lg:col-span-7">
                    <p className={`text-2xl font-bold md:text-3xl ${gradientText}`}>{page.journey_eyebrow}</p>
                    <h2 id="journey-heading" className="mt-1 text-lg font-bold md:text-xl">{page.journey_title}</h2>
                    <Paragraphs text={page.journey_body} className="mt-5 max-w-136 text-[15px] leading-[1.8] text-muted md:text-base" />
                </div>
            </section>

            <LetsWorkCTA title={page.cta_title} label={page.cta_label} />
        </main>
    )
}
