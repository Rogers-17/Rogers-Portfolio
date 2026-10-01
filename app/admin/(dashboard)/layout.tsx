import AdminShell from "@/components/admin/AdminShell"
import { requireAdminPage } from "@/lib/admin/auth"
import { countNewProjectRequests } from "@/lib/admin/page-queries"
import { countDueFollowUps } from "@/lib/jobs/queries"

export default async function DashboardLayout ({ children }: { children: React.ReactNode }) {
    const { supabase, user } = await requireAdminPage()
    const [newInquiries, dueFollowUps] = await Promise.all([countNewProjectRequests(supabase), countDueFollowUps(supabase)])
    return <AdminShell email={user.email ?? ""} newInquiries={newInquiries} dueFollowUps={dueFollowUps}>{children}</AdminShell>
}
