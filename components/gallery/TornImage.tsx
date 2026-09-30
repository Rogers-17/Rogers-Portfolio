import Image, { type StaticImageData } from "next/image"

// Photo with a rough, torn / brush-stroke edge. The outline is a jagged polygon generated
// once with a seeded PRNG (identical on server and client) and applied as an SVG clipPath.

function seeded (seed: number) {
    let state = seed
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296
        return state / 4294967296
    }
}

function tornPath (): string {
    const random = seeded(20260930)
    const steps = 46
    const points: [number, number][] = []
    const inset = () => 0.012 + random() * 0.045 + (random() > 0.86 ? random() * 0.05 : 0)

    for (let i = 0; i < steps; i++) points.push([i / steps, inset()]) // top
    for (let i = 0; i < steps; i++) points.push([1 - inset(), i / steps]) // right
    for (let i = 0; i < steps; i++) points.push([1 - i / steps, 1 - inset()]) // bottom
    for (let i = 0; i < steps; i++) points.push([inset(), 1 - i / steps]) // left

    return `M${points.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join("L")}Z`
}

const PATH = tornPath()
const CLIP_ID = "torn-edge-clip"

export default function TornImage ({ src, alt, priority }: { src: string | StaticImageData, alt: string, priority?: boolean }) {
    return (
        <div className="relative mx-auto w-full max-w-116">
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
                <clipPath id={CLIP_ID} clipPathUnits="objectBoundingBox">
                    <path d={PATH} />
                </clipPath>
            </svg>
            <div className="pointer-events-none absolute inset-[8%] rounded-full bg-accent-2/25 blur-[70px]" aria-hidden="true" />
            <div className="relative aspect-4/3 bg-[#1a1030]" style={{ clipPath: `url(#${CLIP_ID})` }}>
                <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 1200px) 464px, 90vw" className="object-cover object-top" />
            </div>
        </div>
    )
}
