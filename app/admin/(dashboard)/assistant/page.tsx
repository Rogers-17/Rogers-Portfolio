import { requireAdminPage } from "@/lib/admin/auth"
import AssistantWorkspace from "@/components/admin/assistant/AssistantWorkspace"

export default async function AssistantPage () {
    await requireAdminPage()
    return <AssistantWorkspace />
}
