import { notFound } from "next/navigation"
import TestimonialForm from "@/components/admin/TestimonialForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getTestimonialForAdmin } from "@/lib/admin/content-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditTestimonialPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const testimonial = await getTestimonialForAdmin(supabase, id.data)
    if (!testimonial) notFound()

    return <TestimonialForm key={testimonial.id} testimonial={testimonial} />
}
