"use client"

import * as React from "react"
import Image, { type StaticImageData } from "next/image"
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu"

export type MasonryPhoto = {
    id: string
    src: string | StaticImageData
    width: number
    height: number
    alt: string
    caption: string | null
}

// Masonry grid (1 / 2 / 3 columns) that keeps each photo's aspect ratio, plus a
// native <dialog> lightbox with arrow-key navigation.
export default function GalleryMasonry ({ photos }: { photos: MasonryPhoto[] }) {
    const [index, setIndex] = React.useState<number | null>(null)
    const dialogRef = React.useRef<HTMLDialogElement>(null)
    const openerRef = React.useRef<HTMLButtonElement | null>(null)
    const current = index === null ? null : photos[index]

    function open (photoIndex: number, opener: HTMLButtonElement) {
        openerRef.current = opener
        setIndex(photoIndex)
        dialogRef.current?.showModal()
    }

    const step = (delta: number) => setIndex(value => (value === null ? value : (value + delta + photos.length) % photos.length))

    return (
        <>
            <ul className="columns-1 gap-3 min-[560px]:columns-2 md:gap-4 lg:columns-3">
                {photos.map((photo, photoIndex) => (
                    <li key={photo.id} className="mb-3 break-inside-avoid md:mb-4">
                        <button
                            type="button"
                            onClick={event => open(photoIndex, event.currentTarget)}
                            aria-label={`Open photo: ${photo.caption ?? photo.alt}`}
                            className="group block w-full overflow-hidden rounded-xl bg-[#1a1030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"
                        >
                            <Image
                                src={photo.src}
                                alt={photo.alt}
                                width={photo.width}
                                height={photo.height}
                                sizes="(min-width: 1200px) 334px, (min-width: 560px) 50vw, 100vw"
                                className="h-auto w-full transition-[transform,filter] duration-500 group-hover:scale-[1.02] group-hover:brightness-110"
                            />
                        </button>
                    </li>
                ))}
            </ul>

            <dialog
                ref={dialogRef}
                aria-label="Photo viewer"
                onClose={() => {
                    setIndex(null)
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
                            <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
                        </div>
                        {current.caption && <p className="text-center font-semibold">{current.caption}</p>}
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
