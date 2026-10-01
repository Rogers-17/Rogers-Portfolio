import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ACTIVE_STATUSES, type JobRecord } from "@/lib/jobs/schema"

const COLUMNS = "id, company, role, job_url, location, salary, source, status, sort_order, applied_on, follow_up_on, resume_id, cover_letter_id, priority, notes, is_archived, status_changed_at, created_at, updated_at"

function fail (error: { message: string, code?: string }): never {
    const missing = error.code === "PGRST205" || error.code === "42P01"
    throw new Error(missing
        ? "The job_applications table doesn't exist yet. Run supabase/migrations/20261004000000_resume_extras.sql in the Supabase SQL Editor."
        : `Failed to load applications: ${error.message}`)
}

export async function listJobs (supabase: SupabaseClient, archived = false): Promise<JobRecord[]> {
    const { data, error } = await supabase
        .from("job_applications")
        .select(COLUMNS)
        .eq("is_archived", archived)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1000)
    if (error) fail(error)
    return (data ?? []) as JobRecord[]
}

export async function getJob (supabase: SupabaseClient, id: string): Promise<JobRecord | null> {
    const { data, error } = await supabase.from("job_applications").select(COLUMNS).eq("id", id).maybeSingle()
    if (error) fail(error)
    return data as JobRecord | null
}

// Sidebar badge: follow-ups due today or overdue. Never throws.
export async function countDueFollowUps (supabase: SupabaseClient): Promise<number> {
    const today = new Date().toISOString().slice(0, 10)
    const { count, error } = await supabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false)
        .in("status", ACTIVE_STATUSES)
        .lte("follow_up_on", today)
    return error ? 0 : count ?? 0
}

export async function countApplicationsForResume (supabase: SupabaseClient, resumeId: string): Promise<number> {
    const { count, error } = await supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("resume_id", resumeId)
    return error ? 0 : count ?? 0
}
