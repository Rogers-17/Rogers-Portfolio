import { resumeToText, visibleSections } from "@/lib/resume/normalize"
import type { ResumeData, TailorKeyword } from "@/lib/resume/schema"

// Free, local resume checks (no AI call). Keyword coverage uses the keywords from the
// last Tailor analysis of the saved job description.

export type Check = { id: string, level: "error" | "warning" | "tip", message: string, target?: string }

const WEAK_START = /^(responsible for|helped|worked on|assisted( with)?|duties included|tasked with|in charge of|involved in)\b/i

function years (value: string) {
    return (value.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number)
}

export function runChecks (data: ResumeData, pages: number): Check[] {
    const checks: Check[] = []
    const { contact } = data
    const sections = visibleSections(data)
    const has = (type: string) => sections.some(section => section.type === type)

    if (!contact.fullName.trim()) checks.push({ id: "name", level: "error", message: "Add your full name.", target: "contact" })
    if (!contact.email.trim()) checks.push({ id: "email", level: "error", message: "Add an email address so recruiters can reach you.", target: "contact" })
    if (!contact.phone.trim()) checks.push({ id: "phone", level: "warning", message: "Add a phone number.", target: "contact" })
    if (!contact.location.trim()) checks.push({ id: "location", level: "tip", message: "Add your city and country; many recruiters filter by location.", target: "contact" })
    if (!contact.headline.trim()) checks.push({ id: "headline", level: "tip", message: "Add a headline under your name (the role you're targeting).", target: "contact" })

    if (!has("summary")) checks.push({ id: "summary", level: "warning", message: "Add a short profile summary at the top." })
    if (!has("experience")) checks.push({ id: "experience", level: "error", message: "Add at least one work experience entry." })
    if (!has("skills")) checks.push({ id: "skills", level: "warning", message: "Add a skills section; ATS systems match on it." })
    if (!has("education")) checks.push({ id: "education", level: "tip", message: "Add your education or certificates." })

    const summary = sections.find(section => section.kind === "text" && section.type === "summary")
    if (summary && summary.kind === "text") {
        const length = summary.text.length
        if (length < 150) checks.push({ id: "summary-short", level: "tip", message: "Your summary is short. 2–4 sentences (150–600 characters) works best.", target: `section:${summary.id}` })
        if (length > 700) checks.push({ id: "summary-long", level: "warning", message: "Your summary is long. Keep it under ~600 characters.", target: `section:${summary.id}` })
    }

    let bulletCount = 0
    let withNumbers = 0
    const verbs = new Map<string, number>()
    for (const section of sections) {
        if (section.kind !== "entries") continue
        for (const entry of section.entries) {
            const target = `section:${section.id}`
            if (section.type === "experience" && entry.bullets.length < 2) {
                checks.push({ id: `few-${entry.id}`, level: "warning", message: `“${entry.title || "An experience entry"}” has fewer than 2 bullets.`, target })
            }
            const [startYear] = years(entry.date.split("–")[0] ?? "")
            const endYear = years(entry.date.split("–")[1] ?? "")[0]
            if (startYear && endYear && endYear < startYear) {
                checks.push({ id: `dates-${entry.id}`, level: "error", message: `“${entry.title}” ends before it starts (${entry.date}).`, target })
            }
            for (const bullet of entry.bullets) {
                bulletCount++
                if (/\d/.test(bullet)) withNumbers++
                if (WEAK_START.test(bullet)) {
                    checks.push({ id: `weak-${entry.id}-${bulletCount}`, level: "tip", message: `Start with an action verb instead of “${bullet.match(WEAK_START)?.[0]}”: “${bullet.slice(0, 60)}${bullet.length > 60 ? "…" : ""}”`, target })
                }
                if (bullet.length > 260) checks.push({ id: `long-${entry.id}-${bulletCount}`, level: "tip", message: `A bullet in “${entry.title}” is very long; split it or trim it.`, target })
                const verb = bullet.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "")
                if (verb && verb.length > 3) verbs.set(verb, (verbs.get(verb) ?? 0) + 1)
            }
        }
    }

    if (bulletCount >= 4 && withNumbers / bulletCount < 0.3) {
        checks.push({ id: "numbers", level: "tip", message: `Only ${withNumbers} of ${bulletCount} bullets include a number. Add results (%, amounts, counts, time saved) where you can.` })
    }
    for (const [verb, count] of verbs) {
        if (count >= 4) checks.push({ id: `verb-${verb}`, level: "tip", message: `“${verb[0].toUpperCase()}${verb.slice(1)}” starts ${count} bullets. Vary your verbs.` })
    }
    if (pages > 2) checks.push({ id: "pages", level: "warning", message: `The PDF is ${pages} pages. Aim for 1–2: try Compact density or trim older roles.` })

    return checks
}

export function keywordCoverage (data: ResumeData, keywords: TailorKeyword[]) {
    const text = resumeToText(data).toLowerCase()
    const escape = (value: string) => value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const matched: TailorKeyword[] = []
    const missing: TailorKeyword[] = []
    for (const keyword of keywords) {
        const pattern = new RegExp(`(^|[^a-z0-9])${escape(keyword.keyword)}($|[^a-z0-9])`, "i")
        ;(pattern.test(text) ? matched : missing).push(keyword)
    }
    const weight = (keyword: TailorKeyword) => ({ high: 3, medium: 2, low: 1 })[keyword.importance]
    const total = keywords.reduce((sum, keyword) => sum + weight(keyword), 0)
    const got = matched.reduce((sum, keyword) => sum + weight(keyword), 0)
    return { matched, missing, percent: total ? Math.round((got / total) * 100) : null }
}

export function qualityScore (checks: Check[]) {
    const penalty = checks.reduce((sum, check) => sum + ({ error: 12, warning: 6, tip: 2 })[check.level], 0)
    return Math.max(0, Math.min(100, 100 - penalty))
}
