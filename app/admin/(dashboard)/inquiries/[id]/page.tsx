import { notFound } from "next/navigation"
import InquiryDetail from "@/components/admin/InquiryDetail"
import { requireAdminPage } from "@/lib/admin/auth"
import { getProjectRequest } from "@/lib/admin/page-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function InquiryPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const inquiry = await getProjectRequest(supabase, id.data)
    if (!inquiry) notFound()

    return <InquiryDetail key={inquiry.id} inquiry={inquiry} />
}
