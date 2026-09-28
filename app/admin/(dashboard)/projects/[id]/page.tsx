import { notFound } from "next/navigation"
import ProjectForm from "@/components/admin/ProjectForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getProjectForAdmin, listTechnologiesForAdmin } from "@/lib/admin/queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditProjectPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const [project, technologies] = await Promise.all([
        getProjectForAdmin(supabase, id.data),
        listTechnologiesForAdmin(supabase),
    ])
    if (!project) notFound()

    return <ProjectForm key={project.id} project={project} technologies={technologies} />
}
