import Link from "next/link"
import { FiPlus } from "react-icons/fi"
import ContentList from "@/components/admin/ContentList"
import { primaryButtonClass } from "@/components/admin/Field"
import { requireAdminPage } from "@/lib/admin/auth"
import { listExperiencesForAdmin } from "@/lib/admin/content-queries"

export default async function AdminExperiencePage () {
    const { supabase } = await requireAdminPage()
    const experiences = await listExperiencesForAdmin(supabase)

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Experience</h1>
                    <p className="mt-1 text-sm text-muted">Order here is the order of the homepage timeline.</p>
                </div>
                <Link href="/admin/experience/new" className={primaryButtonClass}>
                    <FiPlus aria-hidden="true" />
                    New experience
                </Link>
            </div>
            <ContentList
                items={experiences.map(experience => ({
                    id: experience.id,
                    title: experience.role,
                    subtitle: [experience.company, experience.location].filter(Boolean).join(" · "),
                    meta: experience.period,
                    badge: experience.is_current ? "Current" : null,
                    imageUrl: experience.logoUrl,
                    initials: experience.initials,
                    editHref: `/admin/experience/${experience.id}`,
                    switches: [{ field: "is_published", label: "Published", checked: experience.is_published }],
                }))}
                endpoint="/api/admin/experiences"
                itemLabel="Experience"
                allowDelete
                emptyTitle="No experience yet"
                emptyHint="Add the roles you want on your timeline."
                newHref="/admin/experience/new"
            />
        </>
    )
}
