import Link from "next/link"
import type { IconType } from "react-icons"
import { FaArrowRight } from "react-icons/fa"

type Action = { label: string, href: string }

type Props = {
    icon: IconType
    title: string
    body: string
    topics?: string[]
    primary: Action
    secondary?: Action
}

export default function ComingSoon ({ icon: Icon, title, body, topics = [], primary, secondary }: Props) {
    return (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-white/6 bg-card p-8 md:mt-14 md:p-12">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-1/15 blur-[100px]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-accent-2/20 blur-[100px]" aria-hidden="true" />

            <div className="relative max-w-2xl">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-65/srgb from-accent-1 to-accent-2 text-2xl text-white shadow-[0_8px_30px_rgba(222,14,255,0.3)]">
                    <Icon aria-hidden="true" />
                </span>
                <h2 className="mt-6 text-2xl font-bold md:text-3xl">{title}</h2>
                <p className="mt-3 leading-relaxed text-muted">{body}</p>

                {topics.length > 0 && (
                    <ul className="mt-6 flex flex-wrap gap-2" aria-label="Topics">
                        {topics.map(topic => (
                            <li key={topic} className="rounded-full border border-white/10 bg-white/4 px-4 py-1.5 text-sm font-medium text-fg/90">{topic}</li>
                        ))}
                    </ul>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={primary.href} className="group inline-flex items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(222,14,255,0.3)] transition-all duration-300 hover:-translate-y-0.5">
                        {primary.label}
                        <FaArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                    {secondary && (
                        <Link href={secondary.href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors duration-300 hover:border-accent-1">
                            {secondary.label}
                        </Link>
                    )}
                </div>
            </div>
        </section>
    )
}
