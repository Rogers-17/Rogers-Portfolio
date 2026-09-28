import type { Metadata } from "next"
import { LuBookOpen } from "react-icons/lu"
import ComingSoon from "@/components/ui/ComingSoon"
import PageHeader from "@/components/ui/PageHeader"

export const metadata: Metadata = {
    title: "Blog | Rogers Portfolio",
    description: "Design, code and product lessons from shipping real products. Coming soon.",
}

export default function BlogPage () {
    return (
        <main className="mx-auto w-full px-5 pb-24 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
            <PageHeader
                badge="Blog ✍🏽"
                title="Notes from the build."
                highlight="Coming soon."
                intro="Design, code and product lessons from shipping real products."
            />
            <ComingSoon
                icon={LuBookOpen}
                title="First posts are on the way"
                body="I'm writing up the lessons behind the projects: design systems, full-stack builds, AI products and the business side of freelancing."
                topics={["Design Systems", "Next.js", "Supabase", "AI Products", "Freelancing"]}
                primary={{ label: "See my work", href: "/projects" }}
                secondary={{ label: "Start a project", href: "/start-a-project" }}
            />

            {/* Decorative preview of the future post layout. */}
            <div className="mt-10 grid gap-5 md:grid-cols-3" aria-hidden="true">
                {[0, 1, 2].map(index => (
                    <div key={index} className="rounded-2xl border border-white/6 bg-white/3 p-4 opacity-60">
                        <div className="aspect-[16/10] animate-pulse rounded-xl bg-white/6" />
                        <span className="mt-4 inline-block rounded-full bg-accent-1/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-1">Coming soon</span>
                        <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/8" />
                        <div className="mt-2 h-3 w-full animate-pulse rounded bg-white/5" />
                        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/5" />
                    </div>
                ))}
            </div>
        </main>
    )
}
