import AboutFactForm from "@/components/admin/AboutFactForm"
import { requireAdminPage } from "@/lib/admin/auth"

export default async function NewAboutFactPage () {
    await requireAdminPage()
    return <AboutFactForm />
}
