"use client"

import * as React from "react"
import { adminFetch } from "@/lib/admin/client"
import type { GitHubStats } from "@/lib/github/stats"

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1"

export default function GitHubDashboard ({ initial }: { initial: GitHubStats }) {
    const [stats, setStats] = React.useState(initial)
    const [year, setYear] = React.useState(initial.year)
    const [error, setError] = React.useState("")
    const max = Math.max(1, ...stats.days.map(day => day.count))
    const commitWeeks: typeof stats.commitDays[] = []
    for (let i = 0; i < stats.commitDays.length; i += 7) commitWeeks.push(stats.commitDays.slice(i, i + 7))
    const commitsByWeek = commitWeeks.map(week => week.reduce((sum, day) => sum + day.count, 0))
    const maxCommits = Math.max(1, ...commitsByWeek)

    async function loadYear (value: number) {
        setYear(value)
        setError("")
        const result = await adminFetch<GitHubStats>(`/api/admin/github/stats?year=${value}`)
        if (result.ok) setStats(result.data)
        else setError(result.error.message)
    }

    return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold tracking-[0.2em] text-accent-1 uppercase">Admin overview</p><h1 className="mt-2 text-3xl font-bold text-fg">GitHub activity</h1><p className="mt-2 text-sm text-muted">A private-aware view of your contributions, pull requests, reviews, and consistency.</p></div>
            <label className="text-xs font-medium text-muted">Year<select value={year} onChange={event => void loadYear(Number(event.target.value))} className={`ml-2 h-10 rounded-xl border border-white/10 bg-card px-3 text-sm text-fg ${focusRing}`}>{Array.from({ length: 6 }, (_, i) => new Date().getUTCFullYear() - i).map(item => <option key={item}>{item}</option>)}</select></label>
        </div>
        {!stats.configured && <section className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><h2 className="font-semibold text-amber-100">Connect GitHub stats</h2><p className="mt-2 text-sm text-muted">Set the server-only <code>GITHUB_READ_TOKEN</code> to a read-only token with access to the repositories you want included. Enable private contribution totals in your GitHub profile; GitHub may also require user profile read access. Private repository names and content never leave the server.</p></section>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Activity score" value={`${stats.score}/100`} hint="Commits 50% · merged PRs 30% · reviews 20%" />
            <Stat label="Commits" value={stats.commits.toLocaleString()} hint={`${stats.contributions.toLocaleString()} total GitHub contributions`} />
            <Stat label="Pull requests" value={stats.prsOpened.toLocaleString()} hint={`${stats.prsMerged.toLocaleString()} merged during ${year}`} />
            <Stat label="Pull request reviews" value={stats.reviews.toLocaleString()} hint={`${stats.currentStreak} day current · ${stats.longestStreak} day longest streak`} />
        </div>
        <section className="mt-5 rounded-2xl border border-white/8 bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-fg">Contribution calendar</h2><p className="mt-1 text-xs text-muted">GitHub’s daily contribution total, including commits, pull requests, reviews, and other contribution types. Private activity is included in the count.</p></div><span className="text-xs text-muted">{stats.contributions.toLocaleString()} contributions</span></div>
            {stats.configured && <div className="mt-5 overflow-x-auto pb-2"><div className="grid min-w-[680px] grid-flow-col grid-rows-7 gap-1" aria-label={`${year} contribution calendar`}>{stats.days.map(day => <span key={day.date} title={`${day.date}: ${day.count} contributions`} aria-label={`${day.date}: ${day.count} contributions`} className="size-3 rounded-[3px] border border-white/5" style={{ backgroundColor: day.count ? `rgba(222,14,255,${0.2 + 0.8 * Math.min(day.count / max, 1)})` : "rgba(255,255,255,.04)" }} />)}</div></div>}
        </section>
        <section className="mt-5 rounded-2xl border border-white/8 bg-card p-4 sm:p-6"><h2 className="text-lg font-semibold text-fg">Weekly commit chart</h2><p className="mt-1 text-xs text-muted">GitHub commit contributions grouped by week. The chart uses up to 100 repositories and 100 contributions per repository; the commit total card remains the full account total. {stats.commitChartComplete ? "No per-repository contribution pages were truncated." : "GitHub capped some per-repository daily details."}</p><div className="mt-5 flex h-40 items-end gap-1 overflow-x-auto">{commitsByWeek.map((count, i) => <div key={i} title={`Week ${i + 1}: ${count} commit contributions`} className="min-w-2 flex-1 rounded-t-sm bg-linear-to-t from-accent-2 to-accent-1" style={{ height: `${Math.max(3, count / maxCommits * 100)}%` }} />)}</div></section>
        {stats.configured && stats.restrictedContributions === 0 && <p className="mt-3 text-xs text-dim">GitHub reports no restricted contribution count for this year. Private contribution totals depend on the account’s GitHub visibility setting and token access.</p>}
        <p className="mt-4 text-xs text-dim">Score formula: commits (up to 365) × 50 points, merged PRs (up to 30) × 30 points, and PR reviews (up to 50) × 20 points. {stats.fetchedAt ? `Last refreshed ${new Date(stats.fetchedAt).toLocaleString()}.` : ""} Source: GitHub GraphQL API for @{stats.login}.</p>
    </main>
}

function Stat ({ label, value, hint }: { label: string, value: string, hint: string }) {
    return <section className="rounded-2xl border border-white/8 bg-card p-4"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-fg">{value}</p><p className="mt-2 text-xs leading-5 text-dim">{hint}</p></section>
}
