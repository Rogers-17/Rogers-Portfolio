import ProjectFormSettingsForm from "@/components/admin/ProjectFormSettingsForm"
import SeedNotice from "@/components/admin/SeedNotice"
import { requireAdminPage } from "@/lib/admin/auth"
import { getProjectFormForAdmin } from "@/lib/admin/page-queries"

export default async function AdminProjectFormPage () {
    const { supabase } = await requireAdminPage()
    const { exists, ...settings } = await getProjectFormForAdmin(supabase)

    return (
        <>
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl font-bold md:text-3xl">Project form</h1>
                <p className="mt-1 text-sm text-muted">Contact channels, answer options and texts for /start-a-project.</p>
            </div>
            <SeedNotice show={!exists} />
            <ProjectFormSettingsForm settings={settings} />
        </>
    )
}
