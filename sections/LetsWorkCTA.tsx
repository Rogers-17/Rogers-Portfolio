import Link from "next/link"
import { LuArrowRight } from "react-icons/lu"

// Minimal centred CTA used at the end of the About and Gallery pages.
export default function LetsWorkCTA ({ title, label }: { title: string, label: string }) {
    return (
        <section className="relative bg-surface px-5 py-24 text-center md:py-32" aria-labelledby="lets-work-heading">
            <h2 id="lets-work-heading" className="text-2xl font-bold leading-tight md:text-4xl">{title}</h2>
            <Link
                href="/start-a-project"
                className="group mt-4 inline-flex items-center gap-2 rounded-lg bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-3xl font-bold text-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-1 md:mt-5 md:gap-3 md:text-5xl"
            >
                {label}
                <LuArrowRight className="size-7 text-accent-2 transition-transform duration-300 group-hover:translate-x-1 md:size-10" aria-hidden="true" />
            </Link>
        </section>
    )
}
