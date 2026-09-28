"use client"

import * as React from "react"
import Image from "next/image"
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu"
import { galleryCategories, type GalleryCategory, type GalleryItem } from "@/utils/content/gallery"

const aspectClass: Record<GalleryItem["aspect"], string> = {
    portrait: "aspect-[4/5]",
    landscape: "aspect-[4/3]",
    square: "aspect-square",
}

type Filter = "All" | GalleryCategory

export default function GalleryGrid ({ items }: { items: GalleryItem[] }) {
    const [filter, setFilter] = React.useState<Filter>("All")
    const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null)
    const dialogRef = React.useRef<HTMLDialogElement>(null)
    const openerRef = React.useRef<HTMLButtonElement | null>(null)

    const visible = filter === "All" ? items : items.filter(item => item.category === filter)
    const photos = visible.filter(item => item.src)
    const current = lightboxIndex === null ? null : photos[lightboxIndex]

    function openLightbox (item: GalleryItem, opener: HTMLButtonElement) {
        openerRef.current = opener
        setLightboxIndex(photos.indexOf(item))
        dialogRef.current?.showModal()
    }

    const step = (delta: number) =>
        setLightboxIndex(index => (index === null ? index : (index + delta + photos.length) % photos.length))

    return (
        <>
            <div className="mt-10 flex flex-wrap gap-2 md:mt-12" role="group" aria-label="Filter gallery">
                {(["All", ...galleryCategories] as Filter[]).map(option => (
                    <button
                        key={option}
                        type="button"
                        aria-pressed={filter === option}
                        onClick={() => setFilter(option)}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${filter === option ? "bg-linear-65/srgb from-accent-1 to-accent-2 text-white" : "border border-white/10 bg-white/4 text-fg/90 hover:border-accent-1"}`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <ul key={filter} className="mt-8 animate-fade-in columns-1 gap-5 min-[560px]:columns-2 lg:columns-3">
                {visible.map(item => (
                    <li key={item.id} className="mb-5 break-inside-avoid">
                        <figure className={`group relative overflow-hidden rounded-2xl border border-white/6 bg-card ${aspectClass[item.aspect]}`}>
                            {item.src ? (
                                <button
                                    type="button"
                                    onClick={event => openLightbox(item, event.currentTarget)}
                                    aria-label={`Open photo: ${item.caption}`}
                                    className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-1"
                                >
                                    <Image
                                        src={item.src}
                                        alt={item.alt}
                                        fill
                                        sizes="(min-width: 1200px) 33vw, (min-width: 560px) 50vw, 100vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </button>
                            ) : (
                                <div className="absolute inset-0" aria-hidden="true">
                                    <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,rgba(222,14,255,0.16),transparent_60%),radial-gradient(120%_120%_at_90%_100%,rgba(117,28,255,0.22),transparent_55%)]" />
                                    <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
                                </div>
                            )}
                            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-4 pt-12 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                                <span className="block text-xs font-bold uppercase tracking-wider text-accent-1">{item.category}</span>
                                <span className="mt-1 block font-semibold text-white">{item.caption}</span>
                            </figcaption>
                        </figure>
                    </li>
                ))}
            </ul>
            {visible.length === 0 && <p className="mt-8 text-muted">No photos in this category yet.</p>}

            <dialog
                ref={dialogRef}
                aria-label="Photo viewer"
                onClose={() => {
                    setLightboxIndex(null)
                    openerRef.current?.focus()
                }}
                onClick={event => { if (event.target === dialogRef.current) dialogRef.current?.close() }}
                onKeyDown={event => {
                    if (event.key === "ArrowRight") step(1)
                    if (event.key === "ArrowLeft") step(-1)
                }}
                className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-4 text-white backdrop:bg-black/85 backdrop:backdrop-blur-sm md:p-10"
            >
                {current && (
                    <div className="flex h-full flex-col items-center justify-center gap-4">
                        <div className="relative w-full flex-1">
                            <Image src={current.src!} alt={current.alt} fill sizes="100vw" className="object-contain" />
                        </div>
                        <p className="text-center font-semibold">{current.caption}</p>
                        {photos.length > 1 && (
                            <>
                                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:border-accent-1 md:left-6">
                                    <LuChevronLeft className="size-6" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute top-1/2 right-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:border-accent-1 md:right-6">
                                    <LuChevronRight className="size-6" aria-hidden="true" />
                                </button>
                            </>
                        )}
                        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close photo viewer" className="absolute top-3 right-3 inline-flex size-12 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:border-accent-1 md:top-6 md:right-6">
                            <LuX className="size-6" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </dialog>
        </>
    )
}
