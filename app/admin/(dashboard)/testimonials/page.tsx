import Link from "next/link"
import { FiPlus } from "react-icons/fi"
import ContentList from "@/components/admin/ContentList"
import { primaryButtonClass } from "@/components/admin/Field"
import { requireAdminPage } from "@/lib/admin/auth"
import { listTestimonialsForAdmin } from "@/lib/admin/content-queries"

export default async function AdminTestimonialsPage () {
    const { supabase } = await requireAdminPage()
    const testimonials = await listTestimonialsForAdmin(supabase)

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Testimonials</h1>
                    <p className="mt-1 text-sm text-muted">Order here is the order on the homepage.</p>
                </div>
                <Link href="/admin/testimonials/new" className={primaryButtonClass}>
                    <FiPlus aria-hidden="true" />
                    New testimonial
                </Link>
            </div>
            <ContentList
                items={testimonials.map(testimonial => ({
                    id: testimonial.id,
                    title: testimonial.author_name,
                    subtitle: testimonial.author_role,
                    preview: `“${testimonial.quote}”`,
                    meta: testimonial.rating ? "★".repeat(testimonial.rating) : null,
                    imageUrl: testimonial.avatarUrl,
                    initials: testimonial.initials,
                    roundImage: true,
                    editHref: `/admin/testimonials/${testimonial.id}`,
                    switches: [{ field: "is_published", label: "Published", checked: testimonial.is_published }],
                }))}
                endpoint="/api/admin/testimonials"
                itemLabel="Testimonial"
                allowDelete
                emptyTitle="No testimonials yet"
                emptyHint="Add what clients say about working with you."
                newHref="/admin/testimonials/new"
            />
        </>
    )
}
