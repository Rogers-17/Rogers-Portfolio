import { notFound } from "next/navigation"
import AboutFactForm from "@/components/admin/AboutFactForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getAboutFactForAdmin } from "@/lib/admin/page-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditAboutFactPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const fact = await getAboutFactForAdmin(supabase, id.data)
    if (!fact) notFound()

    return <AboutFactForm key={fact.id} fact={fact} />
}
