import type { Metadata } from "next"
import GalleryGrid from "@/components/gallery/GalleryGrid"
import PageHeader from "@/components/ui/PageHeader"
import CallToAction from "@/sections/CallToAction"
import { galleryItems } from "@/utils/content/gallery"

export const metadata: Metadata = {
    title: "Gallery | Rogers Portfolio",
    description: "Moments and milestones from behind the builds.",
}

export default function GalleryPage () {
    return (
        <>
            <main className="mx-auto w-full px-5 pb-10 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
                <PageHeader
                    badge="Gallery 📸"
                    title="Moments & milestones."
                    highlight="Behind the builds."
                    intro="A look at the work, the events and the life around the projects."
                />
                <GalleryGrid items={galleryItems} />
            </main>
            <CallToAction />
        </>
    )
}
