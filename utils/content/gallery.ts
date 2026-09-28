import type { StaticImageData } from "next/image"
import Portrait from "@/assets/images/hero-image.png"

// Gallery content. To add a photo: put the file in /public/gallery/ and set
// `src: "/gallery/<file>.jpg"` (or import it from /assets like the portrait below).
// Items with `src: null` render as styled placeholder tiles until a photo is added.

export const galleryCategories = ["Work", "Events", "Life"] as const
export type GalleryCategory = (typeof galleryCategories)[number]

export type GalleryItem = {
    id: string
    src: StaticImageData | string | null
    alt: string
    caption: string
    category: GalleryCategory
    aspect: "portrait" | "landscape" | "square"
}

export const galleryItems: GalleryItem[] = [
    { id: "portrait", src: Portrait, alt: "Rogers smiling in a black t-shirt", caption: "Hi, that's me", category: "Life", aspect: "portrait" },
    { id: "work-1", src: null, alt: "", caption: "Work photo coming soon", category: "Work", aspect: "landscape" },
    { id: "event-1", src: null, alt: "", caption: "Event photo coming soon", category: "Events", aspect: "square" },
    { id: "work-2", src: null, alt: "", caption: "Work photo coming soon", category: "Work", aspect: "portrait" },
    { id: "event-2", src: null, alt: "", caption: "Event photo coming soon", category: "Events", aspect: "landscape" },
    { id: "life-1", src: null, alt: "", caption: "Photo coming soon", category: "Life", aspect: "square" },
]
