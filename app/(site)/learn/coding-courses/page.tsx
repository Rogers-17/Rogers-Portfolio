import type { Metadata } from "next"
import { LuGraduationCap } from "react-icons/lu"
import ComingSoon from "@/components/ui/ComingSoon"
import PageHeader from "@/components/ui/PageHeader"
import LetsWorkCTA from "@/sections/LetsWorkCTA"
import { pageMetadata } from "@/lib/seo"

// "Coming soon" placeholder: kept out of search (and out of app/sitemap.ts) until the
// courses launch. When they do, remove `robots` here and add the route to the sitemap.
export const metadata: Metadata = pageMetadata({
    title: "Coding Courses",
    description: "Project-based coding courses from Mohammed N. Rogers. Launching soon.",
    path: "/learn/coding-courses",
    robots: { index: false, follow: true },
})

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
            <LetsWorkCTA />
        </>
    )
}
