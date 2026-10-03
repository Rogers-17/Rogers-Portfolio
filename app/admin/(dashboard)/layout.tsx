import { cookies } from "next/headers"
import AdminShell from "@/components/admin/AdminShell"
import { SIDEBAR_COOKIE } from "@/lib/admin/sidebar"
import { requireAdminPage } from "@/lib/admin/auth"
import { countNewProjectRequests } from "@/lib/admin/page-queries"
import { countDueFollowUps } from "@/lib/jobs/queries"

export default async function DashboardLayout ({ children }: { children: React.ReactNode }) {
    const { supabase, user } = await requireAdminPage()
    const [newInquiries, dueFollowUps, cookieStore] = await Promise.all([countNewProjectRequests(supabase), countDueFollowUps(supabase), cookies()])
    // Read on the server so the sidebar renders in its saved state with no flash.
    const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"
    return <AdminShell email={user.email ?? ""} newInquiries={newInquiries} dueFollowUps={dueFollowUps} initialCollapsed={collapsed}>{children}</AdminShell>
}
