"use client"

import * as React from "react"
import Image from "next/image"
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"

type Slide = { id: string, url: string, alt: string }

// Header slider for the project page: native scroll-snap (smooth touch swipe), plus mouse
// drag, arrow buttons, dots and ←/→ keys. Only the first image loads eagerly.
export default function ProjectGallerySlider ({ slides, label }: { slides: Slide[], label: string }) {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [index, setIndex] = React.useState(0)
    const drag = React.useRef<{ x: number, scroll: number, moved: boolean } | null>(null)
    const count = slides.length

    // Track the visible slide from the scroll position.
    function onScroll () {
        const track = trackRef.current
        if (!track) return
        const next = Math.round(track.scrollLeft / track.clientWidth)
        if (next !== index) setIndex(Math.max(0, Math.min(count - 1, next)))
    }

    function go (target: number) {
        const track = trackRef.current
        if (!track) return
        const clamped = (target + count) % count
        track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" })
    }

    // Mouse drag (touch already swipes natively).
    function onPointerDown (event: React.PointerEvent<HTMLDivElement>) {
        if (event.pointerType !== "mouse" || !trackRef.current) return
        drag.current = { x: event.clientX, scroll: trackRef.current.scrollLeft, moved: false }
        trackRef.current.style.scrollSnapType = "none"
    }

    function onPointerMove (event: React.PointerEvent<HTMLDivElement>) {
        const state = drag.current
        const track = trackRef.current
        if (!state || !track) return
        const delta = event.clientX - state.x
        if (Math.abs(delta) > 4) state.moved = true
        track.scrollLeft = state.scroll - delta
    }

    function endDrag (event: React.PointerEvent<HTMLDivElement>) {
        const state = drag.current
        const track = trackRef.current
        if (!state || !track) return
        drag.current = null
        const delta = event.clientX - state.x
        const start = Math.round(state.scroll / track.clientWidth)
        const target = Math.abs(delta) > track.clientWidth * 0.12 ? start + (delta < 0 ? 1 : -1) : start
        track.style.scrollSnapType = ""
        track.scrollTo({ left: Math.max(0, Math.min(count - 1, target)) * track.clientWidth, behavior: "smooth" })
    }

    const button = "absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-[opacity,background-color] hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 md:size-12"

    return (
        <section
            aria-roledescription="carousel"
            aria-label={`${label} screenshots`}
            className="group relative mt-8 overflow-hidden rounded-2xl bg-card"
            onKeyDown={event => {
                if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1) }
                if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1) }
            }}
        >
            <div
                ref={trackRef}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                tabIndex={0}
                aria-label="Use the left and right arrow keys to change image"
                className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-1 [&::-webkit-scrollbar]:hidden ${count > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
                {slides.map((slide, slideIndex) => (
                    <div
                        key={slide.id}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${slideIndex + 1} of ${count}`}
                        className="relative aspect-[16/10] w-full shrink-0 snap-center snap-always select-none"
                    >
                        <Image
                            src={slide.url}
                            alt={slide.alt}
                            fill
                            preload={slideIndex === 0}
                            loading={slideIndex === 0 ? undefined : "lazy"}
                            draggable={false}
                            sizes="(min-width: 1200px) 1040px, 100vw"
                            className="pointer-events-none object-cover"
                        />
                    </div>
                ))}
            </div>

            {count > 1 && (
                <>
                    <button type="button" onClick={() => go(index - 1)} aria-label="Previous image" className={`${button} left-3 md:left-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100`}>
                        <FiChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => go(index + 1)} aria-label="Next image" className={`${button} right-3 md:right-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100`}>
                        <FiChevronRight className="size-5" aria-hidden="true" />
                    </button>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent px-4 pt-10 pb-3">
                        <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur" aria-live="polite">{index + 1} / {count}</span>
                        <div className="pointer-events-auto flex items-center gap-1.5">
                            {slides.map((slide, slideIndex) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => go(slideIndex)}
                                    aria-label={`Show image ${slideIndex + 1}`}
                                    aria-current={slideIndex === index}
                                    className="flex h-6 items-center"
                                >
                                    <span className={`block h-1.5 rounded-full transition-all duration-300 ${slideIndex === index ? "w-6 bg-linear-65/srgb from-accent-1 to-accent-2" : "w-1.5 bg-white/50 hover:bg-white/80"}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}
