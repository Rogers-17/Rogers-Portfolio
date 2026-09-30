import type { Metadata } from "next"
import { LuQuote } from "react-icons/lu"
import Portrait from "@/assets/images/hero-image.png"
import GalleryMasonry, { type MasonryPhoto } from "@/components/gallery/GalleryMasonry"
import TornImage from "@/components/gallery/TornImage"
import Badge from "@/components/ui/Badge"
import Paragraphs from "@/components/ui/Paragraphs"
import { getGalleryContent } from "@/lib/pages/queries"
import LetsWorkCTA from "@/sections/LetsWorkCTA"

export const metadata: Metadata = {
    title: "Gallery | Rogers Portfolio",
    description: "Moments, places and people from behind the builds.",
}

const container = "mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20"

export default async function GalleryPage () {
    const { page, photos } = await getGalleryContent()

    // Until photos are uploaded in the dashboard, show the local portrait so the grid is never empty.
    const gridPhotos: MasonryPhoto[] = photos.length > 0
        ? photos
        : [{ id: "portrait", src: Portrait, width: Portrait.width, height: Portrait.height, alt: page.hero_alt, caption: null }]

    return (
        <main className="bg-surface">
            <section className={`${container} grid gap-12 pt-10 pb-12 md:pt-14 md:pb-16 lg:grid-cols-12 lg:items-center lg:gap-10`}>
                <div className="lg:col-span-6">
                    <Badge>{page.badge}</Badge>
                    <h1 className="mt-5 text-3xl leading-tight font-bold md:text-4xl lg:text-[2.5rem]">
                        {page.title}
                        <br />
                        <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent">{page.highlight}</span>
                    </h1>
                    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
                        <linearGradient id="quote-gradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#de0eff" />
                            <stop offset="100%" stopColor="#751cff" />
                        </linearGradient>
                    </svg>
                    <LuQuote className="mt-6 size-12 rotate-180 fill-[url(#quote-gradient)] stroke-none" aria-hidden="true" />
                    <blockquote className="mt-3">
                        <Paragraphs text={page.quote} className="max-w-120 text-[15px] leading-[1.8] text-muted md:text-base" />
                        {page.signature && <footer className="mt-5 text-sm font-bold text-white">— {page.signature}</footer>}
                    </blockquote>
                </div>
                <div className="lg:col-span-6">
                    <TornImage src={page.heroUrl ?? Portrait} alt={page.hero_alt} priority />
                </div>
            </section>

            <section className={`${container} pb-4`} aria-label="Photos">
                <GalleryMasonry photos={gridPhotos} />
            </section>

            <LetsWorkCTA title={page.cta_title} label={page.cta_label} />
        </main>
    )
}
