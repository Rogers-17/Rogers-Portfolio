import type { Metadata } from "next"
import { LuGraduationCap } from "react-icons/lu"
import ComingSoon from "@/components/ui/ComingSoon"
import PageHeader from "@/components/ui/PageHeader"
import CallToAction from "@/sections/CallToAction"

export const metadata: Metadata = {
    title: "Coding Courses | Rogers Portfolio",
    description: "Coding courses from Rogers. Launching soon.",
}

export default function CodingCoursesPage () {
    return (
        <>
            <main className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20">
                <PageHeader badge="Learn From Me 🎓" title="Coding courses." highlight="Launching soon." />
                <ComingSoon
                    icon={LuGraduationCap}
                    title="Courses are being prepared"
                    body="Practical, project-based lessons on designing and building modern web products are on the way."
                    topics={["HTML & CSS", "JavaScript", "Next.js", "Supabase", "UI Design"]}
                    primary={{ label: "See my work", href: "/projects" }}
                    secondary={{ label: "About me", href: "/about" }}
                />
            </main>
            <CallToAction />
        </>
    )
}
