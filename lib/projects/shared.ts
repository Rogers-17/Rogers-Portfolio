import { z } from "zod"

// Client-safe project constants/schemas (no env or server imports).
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const slugSchema = z.string().max(100).regex(SLUG_PATTERN, "Use lowercase letters, numbers and single dashes")

export const PROJECT_STATUSES = ["active", "in_development", "completed", "archived"] as const
export const projectStatusSchema = z.enum(PROJECT_STATUSES)
export type ProjectStatus = z.infer<typeof projectStatusSchema>

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    active: "Active",
    in_development: "In development",
    completed: "Completed",
    archived: "Archived",
}

export function slugify (value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100)
}
