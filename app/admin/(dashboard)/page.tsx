import { requireAdminPage } from "@/lib/admin/auth"
import GitHubDashboard from "@/components/admin/GitHubDashboard"
import { getGitHubStats, type GitHubStats } from "@/lib/github/stats"

export default async function AdminIndexPage () {
    await requireAdminPage()
    const year = new Date().getUTCFullYear()
    let initial: GitHubStats
    try {
        initial = await getGitHubStats(year)
    } catch {
        initial = { configured: Boolean(process.env.GITHUB_READ_TOKEN), login: "Rogers-17", year, fetchedAt: null, contributions: 0, commits: 0, prsOpened: 0, prsMerged: 0, reviews: 0, restrictedContributions: 0, currentStreak: 0, longestStreak: 0, score: 0, days: [], commitDays: [], commitChartComplete: true }
    }
    return <GitHubDashboard initial={initial} />
}
