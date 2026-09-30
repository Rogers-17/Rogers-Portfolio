import { singletonHandlers } from "@/lib/admin/page-routes"
import { projectFormInputSchema } from "@/lib/admin/page-schemas"
import { getProjectFormForAdmin } from "@/lib/admin/page-queries"
import { revalidateProjectForm } from "@/lib/admin/revalidate"

export const { GET, POST } = singletonHandlers({
    table: "project_form_settings",
    label: "Project form settings",
    inputSchema: projectFormInputSchema,
    get: getProjectFormForAdmin,
    revalidate: revalidateProjectForm,
})
