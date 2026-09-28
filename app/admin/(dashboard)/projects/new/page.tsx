import ProjectForm from "@/components/admin/ProjectForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { listTechnologiesForAdmin } from "@/lib/admin/queries"

export default async function NewProjectPage () {
    const { supabase } = await requireAdminPage()
    const technologies = await listTechnologiesForAdmin(supabase)

    return <ProjectForm technologies={technologies} />
}
