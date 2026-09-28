import ExperienceForm from "@/components/admin/ExperienceForm"
import { requireAdminPage } from "@/lib/admin/auth"

export default async function NewExperiencePage () {
    await requireAdminPage()
    return <ExperienceForm />
}
