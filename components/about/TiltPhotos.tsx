"use client"

import * as React from "react"
import Image, { type StaticImageData } from "next/image"
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"

type Photo = { src: string | StaticImageData, alt: string }

const SPRING = { stiffness: 220, damping: 18, mass: 0.6 }
const MAX_TILT = 12

// A photo that tilts towards the cursor in 3D (with a moving glare) and can be dragged;
// it springs back to its resting spot on release. Tilt only reacts to a mouse.
function TiltCard ({ photo, restRotate, className, sizes, priority }: { photo: Photo, restRotate: number, className: string, sizes: string, priority?: boolean }) {
    const reduceMotion = useReducedMotion()
    const pointerX = useMotionValue(0.5)
    const pointerY = useMotionValue(0.5)
    const rotateX = useSpring(useTransform(pointerY, [0, 1], [MAX_TILT, -MAX_TILT]), SPRING)
    const rotateY = useSpring(useTransform(pointerX, [0, 1], [-MAX_TILT, MAX_TILT]), SPRING)
    const glareX = useTransform(pointerX, value => `${value * 100}%`)
    const glareY = useTransform(pointerY, value => `${value * 100}%`)
    const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28), transparent 55%)`
    const [hovering, setHovering] = React.useState(false)

    function onPointerMove (event: React.PointerEvent<HTMLDivElement>) {
        if (reduceMotion || event.pointerType !== "mouse") return
        const rect = event.currentTarget.getBoundingClientRect()
        pointerX.set((event.clientX - rect.left) / rect.width)
        pointerY.set((event.clientY - rect.top) / rect.height)
    }

    function reset () {
        pointerX.set(0.5)
        pointerY.set(0.5)
        setHovering(false)
    }

    return (
        <motion.div
            className={`absolute select-none ${reduceMotion ? "" : "cursor-grab touch-none active:cursor-grabbing"} ${className}`}
            style={{ rotate: restRotate, rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY, transformPerspective: 900 }}
            drag={!reduceMotion}
            dragSnapToOrigin
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 18 }}
            whileHover={reduceMotion ? undefined : { scale: 1.04, y: -6 }}
            whileDrag={{ scale: 1.06, zIndex: 30 }}
            onPointerMove={onPointerMove}
            onPointerEnter={event => { if (event.pointerType === "mouse") setHovering(true) }}
            onPointerLeave={reset}
        >
            <div className="relative size-full overflow-hidden rounded-2xl border border-white/10 bg-linear-65/srgb from-[#2a1147] to-[#120822] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.75),0_0_40px_-10px_rgba(117,28,255,0.45)]">
                <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} draggable={false} className="pointer-events-none object-cover object-top" />
                <motion.div className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ backgroundImage: glare, opacity: hovering ? 1 : 0 }} aria-hidden="true" />
            </div>
        </motion.div>
    )
}

export default function TiltPhotos ({ primary, secondary }: { primary: Photo, secondary: Photo }) {
    return (
        <div className="relative mx-auto aspect-10/9 w-full max-w-84 md:max-w-104 lg:max-w-none">
            <div className="pointer-events-none absolute inset-[10%] rounded-full bg-accent-2/35 blur-[80px]" aria-hidden="true" />
            <TiltCard photo={primary} restRotate={-6} className="top-0 right-[2%] z-10 aspect-7/6 w-[68%]" sizes="(min-width: 1200px) 300px, 60vw" priority />
            <TiltCard photo={secondary} restRotate={5} className="bottom-0 left-[4%] z-20 aspect-12/11 w-[56%]" sizes="(min-width: 1200px) 250px, 50vw" />
        </div>
    )
}
