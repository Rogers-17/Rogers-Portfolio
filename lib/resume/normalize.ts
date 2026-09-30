import { formatRange, isEmptyItem, type ResumeData, type ResumeSection, type SectionType } from "@/lib/resume/schema"

// Turns every section type into one of three shapes the templates know how to draw.
// Also used by Insights and the AI prompts (plain-text resume).

export type Entry = {
    id: string
    title: string // role, degree field, project name…
    tag: string // credential for education ("Certificate", "Diploma")
    subtitle: string // company, institution, issuer…
    location: string
    date: string
    text: string
    bulletsLabel: string
    bullets: string[]
    lines: string[] // extra lines (references: organisation, address, phone, email)
    url: string
}

export type NormalizedSection =
    | { id: string, type: SectionType, title: string, note: string, kind: "text", text: string }
    | { id: string, type: SectionType, title: string, note: string, kind: "list", items: string[] }
    | { id: string, type: SectionType, title: string, note: string, kind: "entries", entries: Entry[] }

const clean = (value: string | undefined) => (value ?? "").trim()
const cleanBullets = (bullets: string[] | undefined) => (bullets ?? []).map(bullet => bullet.trim()).filter(Boolean)

function entry (partial: Partial<Entry> & { id: string }): Entry {
    return { title: "", tag: "", subtitle: "", location: "", date: "", text: "", bulletsLabel: "", bullets: [], lines: [], url: "", ...partial }
}

export function normalizeSection (section: ResumeSection): NormalizedSection | null {
    const base = { id: section.id, type: section.type, title: clean(section.title), note: clean(section.note) }
    const items = section.items.filter(item => !isEmptyItem(item as Record<string, unknown>))

    switch (section.type) {
        case "summary": {
            const text = section.items.map(item => clean(item.text)).filter(Boolean).join("\n\n")
            return text || base.note ? { ...base, kind: "text", text } : null
        }
        case "skills": {
            const list = section.items.map(item => clean(item.name)).filter(Boolean)
            return list.length || base.note ? { ...base, kind: "list", items: list } : null
        }
        case "languages": {
            const list = section.items.map(item => (clean(item.level) ? `${clean(item.name)} (${clean(item.level)})` : clean(item.name))).filter(Boolean)
            return list.length || base.note ? { ...base, kind: "list", items: list } : null
        }
        default:
            break
    }

    const entries: Entry[] = []
    for (const raw of items) {
        switch (section.type) {
            case "experience": {
                const item = raw as { id: string, role: string, company: string, location: string, start: string, end: string, current: boolean, bulletsLabel: string, bullets: string[] }
                entries.push(entry({ id: item.id, title: clean(item.role), subtitle: clean(item.company), location: clean(item.location), date: formatRange(item), bulletsLabel: clean(item.bulletsLabel), bullets: cleanBullets(item.bullets) }))
                break
            }
            case "education": {
                const item = raw as { id: string, credential: string, field: string, institution: string, location: string, start: string, end: string, current: boolean, notes: string }
                const date = item.current && !clean(item.end) ? (clean(item.start) ? `${clean(item.start)} – Present` : "Ongoing") : formatRange(item)
                entries.push(entry({ id: item.id, title: clean(item.field) || clean(item.credential), tag: clean(item.field) ? clean(item.credential) : "", subtitle: clean(item.institution), location: clean(item.location), date, text: clean(item.notes) }))
                break
            }
            case "projects": {
                const item = raw as { id: string, name: string, role: string, url: string, start: string, end: string, current: boolean, bullets: string[] }
                entries.push(entry({ id: item.id, title: clean(item.name), subtitle: clean(item.role), date: formatRange(item), url: clean(item.url), bullets: cleanBullets(item.bullets) }))
                break
            }
            case "certifications": {
                const item = raw as { id: string, name: string, issuer: string, date: string, url: string }
                entries.push(entry({ id: item.id, title: clean(item.name), subtitle: clean(item.issuer), date: clean(item.date), url: clean(item.url) }))
                break
            }
            case "involvement": {
                const item = raw as { id: string, role: string, organization: string, location: string, start: string, end: string, current: boolean, bullets: string[] }
                entries.push(entry({ id: item.id, title: clean(item.role), subtitle: clean(item.organization), location: clean(item.location), date: formatRange(item), bullets: cleanBullets(item.bullets) }))
                break
            }
            case "awards": {
                const item = raw as { id: string, title: string, issuer: string, date: string, description: string }
                entries.push(entry({ id: item.id, title: clean(item.title), subtitle: clean(item.issuer), date: clean(item.date), text: clean(item.description) }))
                break
            }
            case "coursework": {
                const item = raw as { id: string, name: string, institution: string }
                entries.push(entry({ id: item.id, title: clean(item.name), subtitle: clean(item.institution) }))
                break
            }
            case "references": {
                const item = raw as { id: string, name: string, title: string, organization: string, address: string, phone: string, email: string }
                const lines = [
                    [clean(item.organization), clean(item.address)].filter(Boolean).join(", "),
                    clean(item.phone) ? `Cell#: ${clean(item.phone)}` : "",
                    clean(item.email),
                ].filter(Boolean)
                entries.push(entry({ id: item.id, title: clean(item.name), subtitle: clean(item.title), lines }))
                break
            }
            case "custom": {
                const item = raw as { id: string, heading: string, subheading: string, date: string, description: string, bullets: string[] }
                entries.push(entry({ id: item.id, title: clean(item.heading), subtitle: clean(item.subheading), date: clean(item.date), text: clean(item.description), bullets: cleanBullets(item.bullets) }))
                break
            }
        }
    }

    return entries.length || base.note ? { ...base, kind: "entries", entries } : null
}

export function visibleSections (data: ResumeData): NormalizedSection[] {
    return data.sections.filter(section => section.visible).map(normalizeSection).filter((section): section is NormalizedSection => section !== null)
}

// Plain-text version of the resume for AI prompts and keyword matching.
export function resumeToText (data: ResumeData): string {
    const { contact } = data
    const lines = [
        contact.fullName,
        contact.headline,
        [contact.email, contact.phone, contact.location, contact.linkedin, contact.website].filter(Boolean).join(" | "),
    ]
    for (const section of data.sections.map(normalizeSection)) {
        if (!section) continue
        lines.push("", `## ${section.title}`)
        if (section.note) lines.push(section.note)
        if (section.kind === "text") lines.push(section.text)
        if (section.kind === "list") lines.push(section.items.join(", "))
        if (section.kind === "entries") {
            for (const item of section.entries) {
                lines.push([item.title, item.tag, item.subtitle, item.location, item.date].filter(Boolean).join(" | "))
                if (item.text) lines.push(item.text)
                if (item.bulletsLabel) lines.push(item.bulletsLabel)
                item.bullets.forEach(bullet => lines.push(`- ${bullet}`))
                item.lines.forEach(line => lines.push(line))
            }
        }
    }
    return lines.filter(line => line !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
