import "server-only"

const LOGIN = "Rogers-17"
const TOKEN = process.env.GITHUB_READ_TOKEN
const CACHE_MS = 10 * 60 * 1000

export type GitHubStats = {
    configured: boolean
    login: string
    year: number
    fetchedAt: string | null
    contributions: number
    commits: number
    prsOpened: number
    prsMerged: number
    reviews: number
    restrictedContributions: number
    currentStreak: number
    longestStreak: number
    score: number
    days: { date: string, count: number }[]
    commitDays: { date: string, count: number }[]
    commitChartComplete: boolean
}

const cache = new Map<number, { until: number, value: GitHubStats }>()

async function github<T> (query: string): Promise<T> {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "Rogers-Portfolio-Admin" },
        body: JSON.stringify({ query }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json() as { data?: T, errors?: { message: string }[] }
    if (!response.ok || payload.errors?.length || !payload.data) throw new Error(payload.errors?.[0]?.message ?? `GitHub returned ${response.status}`)
    return payload.data
}

function streaks (days: { date: string, count: number }[]) {
    let longest = 0
    let run = 0
    for (const day of days) {
        run = day.count > 0 ? run + 1 : 0
        longest = Math.max(longest, run)
    }
    let current = 0
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const todayIndex = days.findIndex(day => day.date === today)
    const yesterdayIndex = days.findIndex(day => day.date === yesterday)
    const end = todayIndex >= 0 && days[todayIndex].count > 0 ? todayIndex : yesterdayIndex >= 0 ? yesterdayIndex : -1
    if (end >= 0) for (let i = end; i >= 0 && days[i].count > 0; i--) current++
    return { current, longest }
}

export async function getGitHubStats (year: number): Promise<GitHubStats> {
    if (!TOKEN) return { configured: false, login: LOGIN, year, fetchedAt: null, contributions: 0, commits: 0, prsOpened: 0, prsMerged: 0, reviews: 0, restrictedContributions: 0, currentStreak: 0, longestStreak: 0, score: 0, days: [], commitDays: [], commitChartComplete: true }
    const old = cache.get(year)
    if (old && old.until > Date.now()) return old.value
    const from = `${year}-01-01T00:00:00Z`
    const to = `${year + 1}-01-01T00:00:00Z`
    const data = await github<{ user: null | { contributionsCollection: {
        totalCommitContributions: number
        totalPullRequestContributions: number
        totalPullRequestReviewContributions: number
        restrictedContributionsCount: number
        contributionCalendar: { totalContributions: number, weeks: { contributionDays: { date: string, contributionCount: number }[] }[] }
    } } }>(`query { user(login: "${LOGIN}") { contributionsCollection(from: "${from}", to: "${to}") { totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions restrictedContributionsCount contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`)
    if (!data.user) throw new Error(`GitHub account ${LOGIN} was not found.`)
    const activity = data.user.contributionsCollection
    const days = activity.contributionCalendar.weeks.flatMap(week => week.contributionDays.map(day => ({ date: day.date, count: day.contributionCount }))).filter(day => day.date.startsWith(String(year)))
    const { current, longest } = streaks(days)
    const commitsByRepo = await github<{ user: null | { contributionsCollection: { commitContributionsByRepository: { contributions: { totalCount: number, nodes: { occurredAt: string }[] } }[] } } }>(`query { user(login: "${LOGIN}") { contributionsCollection(from: "${from}", to: "${to}") { commitContributionsByRepository(maxRepositories: 100) { contributions(first: 100) { totalCount nodes { occurredAt } } } } } }`)
    if (!commitsByRepo.user) throw new Error(`GitHub account ${LOGIN} was not found.`)
    const dailyCommits = new Map<string, number>()
    let commitChartComplete = true
    for (const repo of commitsByRepo.user.contributionsCollection.commitContributionsByRepository) {
        if (repo.contributions.totalCount > repo.contributions.nodes.length) commitChartComplete = false
        for (const contribution of repo.contributions.nodes) {
            const date = contribution.occurredAt.slice(0, 10)
            dailyCommits.set(date, (dailyCommits.get(date) ?? 0) + 1)
        }
    }
    const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000
    const commitDays = Array.from({ length: daysInYear }, (_, index) => {
        const date = new Date(Date.UTC(year, 0, index + 1)).toISOString().slice(0, 10)
        return { date, count: dailyCommits.get(date) ?? 0 }
    })
    const prQuery = (filter: string) => `query { search(query: "author:${LOGIN} type:pr ${filter}", type: ISSUE, first: 1) { issueCount } }`
    const [opened, merged] = await Promise.all([
        github<{ search: { issueCount: number } }>(prQuery(`created:${year}-01-01..${year}-12-31`)),
        github<{ search: { issueCount: number } }>(prQuery(`is:merged merged:${year}-01-01..${year}-12-31`)),
    ])
    const commits = activity.totalCommitContributions
    const prsMerged = merged.search.issueCount
    const reviews = activity.totalPullRequestReviewContributions
    const score = Math.round(50 * Math.min(commits / 365, 1) + 30 * Math.min(prsMerged / 30, 1) + 20 * Math.min(reviews / 50, 1))
    const value: GitHubStats = {
        configured: true, login: LOGIN, year, fetchedAt: new Date().toISOString(), contributions: activity.contributionCalendar.totalContributions,
        commits, prsOpened: opened.search.issueCount, prsMerged, reviews, restrictedContributions: activity.restrictedContributionsCount, currentStreak: current, longestStreak: longest, score, days, commitDays, commitChartComplete,
    }
    cache.set(year, { until: Date.now() + CACHE_MS, value })
    return value
}
