import { notFound } from "next/navigation"
import ExperienceForm from "@/components/admin/ExperienceForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getExperienceForAdmin } from "@/lib/admin/content-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditExperiencePage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const experience = await getExperienceForAdmin(supabase, id.data)
    if (!experience) notFound()

    return <ExperienceForm key={experience.id} experience={experience} />
}
