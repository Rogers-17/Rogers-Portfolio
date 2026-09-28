import type { Metadata } from "next"
import { LuRocket } from "react-icons/lu"
import ComingSoon from "@/components/ui/ComingSoon"
import PageHeader from "@/components/ui/PageHeader"

export const metadata: Metadata = {
    title: "Start a Project | Rogers Portfolio",
    description: "Start a project with Rogers. Booking opens soon.",
}

export default function StartAProjectPage () {
    return (
        <main className="mx-auto w-full px-5 pb-24 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
            <PageHeader badge="Start A Project 🚀" title="Let's build something." highlight="Booking opens soon." />
            <ComingSoon
                icon={LuRocket}
                title="Project booking is almost ready"
                body="A short project brief form is on the way. In the meantime, reach out through any of the social links in the footer and I'll get back to you."
                primary={{ label: "See my work", href: "/projects" }}
                secondary={{ label: "About me", href: "/about" }}
            />
        </main>
    )
}
