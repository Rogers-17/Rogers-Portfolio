import AdminShell from "@/components/admin/AdminShell"
import { requireAdminPage } from "@/lib/admin/auth"

export default async function DashboardLayout ({ children }: { children: React.ReactNode }) {
    const { user } = await requireAdminPage()
    return <AdminShell email={user.email ?? ""}>{children}</AdminShell>
}
