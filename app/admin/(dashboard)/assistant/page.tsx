import { requireAdminPage } from "@/lib/admin/auth"
import AssistantWorkspace from "@/components/admin/assistant/AssistantWorkspace"

export const metadata = { title: "Agent workspace | Rogers admin" }

export default async function AssistantPage () {
    await requireAdminPage()
    return <AssistantWorkspace />
}
