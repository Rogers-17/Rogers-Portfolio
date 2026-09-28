import TestimonialForm from "@/components/admin/TestimonialForm"
import { requireAdminPage } from "@/lib/admin/auth"

export default async function NewTestimonialPage () {
    await requireAdminPage()
    return <TestimonialForm />
}
