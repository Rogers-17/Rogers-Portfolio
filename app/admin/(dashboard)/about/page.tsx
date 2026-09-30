import Link from "next/link"
import { FiPlus } from "react-icons/fi"
import AboutPageForm from "@/components/admin/AboutPageForm"
import ContentList from "@/components/admin/ContentList"
import SeedNotice from "@/components/admin/SeedNotice"
import { secondaryButtonClass } from "@/components/admin/Field"
import { FACT_ICON_LABELS } from "@/components/about/fact-icons"
import { requireAdminPage } from "@/lib/admin/auth"
import { getAboutForAdmin, listAboutFactsForAdmin } from "@/lib/admin/page-queries"

export default async function AdminAboutPage () {
    const { supabase } = await requireAdminPage()
    const [{ exists, ...page }, facts] = await Promise.all([getAboutForAdmin(supabase), listAboutFactsForAdmin(supabase)])

    return (
        <>
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl font-bold md:text-3xl">About page</h1>
                <p className="mt-1 text-sm text-muted">Texts, photos and the accordion on /about.</p>
            </div>
            <SeedNotice show={!exists} />
            <AboutPageForm page={page} />

            <section className="mt-10" aria-labelledby="facts-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 id="facts-heading" className="text-lg font-bold">Accordion rows</h2>
                        <p className="mt-1 text-sm text-muted">Born, Education, Career… The first row opens by default.</p>
                    </div>
                    <Link href="/admin/about/facts/new" className={secondaryButtonClass}>
                        <FiPlus aria-hidden="true" />
                        New row
                    </Link>
                </div>
                <ContentList
                    items={facts.map(fact => ({
                        id: fact.id,
                        title: fact.title,
                        subtitle: FACT_ICON_LABELS[fact.icon],
                        preview: fact.body,
                        imageUrl: null,
                        initials: fact.initials,
                        roundImage: true,
                        editHref: `/admin/about/facts/${fact.id}`,
                        switches: [{ field: "is_published", label: "Published", checked: fact.is_published }],
                    }))}
                    endpoint="/api/admin/about-facts"
                    itemLabel="Row"
                    allowDelete
                    emptyTitle="No accordion rows yet"
                    emptyHint="Add rows like Born, Education, Career and Family."
                    newHref="/admin/about/facts/new"
                />
            </section>
        </>
    )
}
