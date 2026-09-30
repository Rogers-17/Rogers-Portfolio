import AdminShell from "@/components/admin/AdminShell"
import { requireAdminPage } from "@/lib/admin/auth"
import { countNewProjectRequests } from "@/lib/admin/page-queries"

export default async function DashboardLayout ({ children }: { children: React.ReactNode }) {
    const { supabase, user } = await requireAdminPage()
    const newInquiries = await countNewProjectRequests(supabase)
    return <AdminShell email={user.email ?? ""} newInquiries={newInquiries}>{children}</AdminShell>
}
