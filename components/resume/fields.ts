import type { IconType } from "react-icons"
import {
    LuAward, LuBookOpen, LuBriefcase, LuCode, LuFileText, LuGraduationCap, LuLanguages, LuLayers,
    LuSparkles, LuTrophy, LuUserCheck, LuUsers,
} from "react-icons/lu"
import type { SectionType } from "@/lib/resume/schema"

// Field layout for each section type's item form (one generic form renders them all).

export type FieldDef = {
    key: string
    label: string
    kind: "text" | "textarea" | "checkbox" | "bullets"
    placeholder?: string
    wide?: boolean // spans both columns
    max: number
    ai?: "summary" | "bullets" // shows the AI helper
}

const dates: FieldDef[] = [
    { key: "start", label: "Start", kind: "text", placeholder: "e.g. Feb 2023", max: 40 },
    { key: "end", label: "End", kind: "text", placeholder: "e.g. 2025", max: 40 },
    { key: "current", label: "I currently do this", kind: "checkbox", max: 0 },
]

export const SECTION_FIELDS: Record<SectionType, FieldDef[]> = {
    summary: [{ key: "text", label: "Summary", kind: "textarea", wide: true, max: 3000, ai: "summary", placeholder: "2–4 sentences about who you are, what you do best and what you're looking for." }],
    experience: [
        { key: "role", label: "Job title", kind: "text", max: 120, placeholder: "Chief of Documentations" },
        { key: "company", label: "Company", kind: "text", max: 160 },
        { key: "location", label: "Location", kind: "text", wide: true, max: 200, placeholder: "City, Country" },
        ...dates,
        { key: "bulletsLabel", label: "Label above bullets (optional)", kind: "text", wide: true, max: 120, placeholder: "Terms of Reference (Key Responsibilities):" },
        { key: "bullets", label: "Responsibilities & achievements", kind: "bullets", wide: true, max: 600, ai: "bullets" },
    ],
    education: [
        { key: "credential", label: "Credential", kind: "text", max: 120, placeholder: "Certificate, Diploma, B.Sc…" },
        { key: "field", label: "Field / programme", kind: "text", max: 200 },
        { key: "institution", label: "Institution", kind: "text", max: 200 },
        { key: "location", label: "Location", kind: "text", max: 200 },
        ...dates.map(field => (field.key === "current" ? { ...field, label: "Ongoing" } : field)),
        { key: "notes", label: "Notes (optional)", kind: "textarea", wide: true, max: 600, placeholder: "Honours, GPA, thesis…" },
    ],
    skills: [{ key: "name", label: "Skill", kind: "text", wide: true, max: 120 }],
    projects: [
        { key: "name", label: "Project name", kind: "text", max: 160 },
        { key: "role", label: "Your role", kind: "text", max: 120 },
        { key: "url", label: "Link", kind: "text", wide: true, max: 300, placeholder: "https://…" },
        ...dates,
        { key: "bullets", label: "Highlights", kind: "bullets", wide: true, max: 600, ai: "bullets" },
    ],
    certifications: [
        { key: "name", label: "Certification", kind: "text", max: 200 },
        { key: "issuer", label: "Issued by", kind: "text", max: 200 },
        { key: "date", label: "Date", kind: "text", max: 40 },
        { key: "url", label: "Credential link", kind: "text", max: 300 },
    ],
    involvement: [
        { key: "role", label: "Role", kind: "text", max: 120 },
        { key: "organization", label: "Organisation", kind: "text", max: 200 },
        { key: "location", label: "Location", kind: "text", wide: true, max: 200 },
        ...dates,
        { key: "bullets", label: "What you did", kind: "bullets", wide: true, max: 600, ai: "bullets" },
    ],
    awards: [
        { key: "title", label: "Award", kind: "text", max: 200 },
        { key: "issuer", label: "Awarded by", kind: "text", max: 200 },
        { key: "date", label: "Date", kind: "text", max: 40 },
        { key: "description", label: "Description", kind: "textarea", wide: true, max: 600 },
    ],
    languages: [
        { key: "name", label: "Language", kind: "text", max: 80 },
        { key: "level", label: "Level", kind: "text", max: 80, placeholder: "Fluent, Native, B2…" },
    ],
    coursework: [
        { key: "name", label: "Course", kind: "text", max: 200 },
        { key: "institution", label: "Institution", kind: "text", max: 200 },
    ],
    references: [
        { key: "name", label: "Name", kind: "text", max: 120 },
        { key: "title", label: "Title", kind: "text", max: 160 },
        { key: "organization", label: "Organisation", kind: "text", max: 200 },
        { key: "address", label: "Address", kind: "text", max: 300 },
        { key: "phone", label: "Phone", kind: "text", max: 60 },
        { key: "email", label: "Email", kind: "text", max: 200 },
    ],
    custom: [
        { key: "heading", label: "Heading", kind: "text", max: 200 },
        { key: "subheading", label: "Subheading", kind: "text", max: 200 },
        { key: "date", label: "Date", kind: "text", wide: true, max: 60 },
        { key: "description", label: "Description", kind: "textarea", wide: true, max: 1500 },
        { key: "bullets", label: "Bullets", kind: "bullets", wide: true, max: 600, ai: "bullets" },
    ],
}

// Sections whose items are single values render as a compact list instead of cards.
export const COMPACT_TYPES: SectionType[] = ["skills", "languages", "coursework"]

export const SECTION_ICONS: Record<SectionType, IconType> = {
    summary: LuFileText,
    experience: LuBriefcase,
    education: LuGraduationCap,
    skills: LuCode,
    projects: LuLayers,
    certifications: LuAward,
    involvement: LuUsers,
    awards: LuTrophy,
    languages: LuLanguages,
    coursework: LuBookOpen,
    references: LuUserCheck,
    custom: LuSparkles,
}

// Card title for a collapsed item.
export function itemLabel (type: SectionType, item: Record<string, unknown>): string {
    const pick = (...keys: string[]) => keys.map(key => String(item[key] ?? "").trim()).filter(Boolean)
    const parts = {
        experience: pick("role", "company"),
        education: pick("credential", "field", "institution"),
        projects: pick("name"),
        certifications: pick("name", "issuer"),
        involvement: pick("role", "organization"),
        awards: pick("title"),
        references: pick("name", "organization"),
        custom: pick("heading"),
    }[type as string] ?? pick("name", "text")
    return parts.slice(0, 2).join(" · ") || "Untitled entry"
}
