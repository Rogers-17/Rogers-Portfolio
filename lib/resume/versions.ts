import "server-only"
import { createHash } from "node:crypto"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_DESIGN, TEMPLATES, designSchema, parseResumeData, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

// Resume version history. Automatic snapshots are taken on save (deduplicated, at most one
// per 10 minutes, newest 50 kept); named versions are kept until you delete them.

const AUTO_WINDOW_MS = 10 * 60 * 1000
const AUTO_KEEP = 50

export type Snapshot = { title: string, template: TemplateKey, design: ResumeDesign, data: ResumeData }

export function contentHash (snapshot: Snapshot) {
    return createHash("sha256").update(JSON.stringify([snapshot.title, snapshot.template, snapshot.design, snapshot.data])).digest("hex")
}

const listRowSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    title: z.string(),
    template: z.enum(TEMPLATES).catch("professional"),
    created_at: z.string(),
    sections: z.number().catch(0),
})

export type VersionListItem = z.infer<typeof listRowSchema>

export async function listVersions (supabase: SupabaseClient, resumeId: string): Promise<VersionListItem[]> {
    const { data, error } = await supabase
        .from("resume_versions")
        .select("id, name, title, template, created_at, data")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(200)
    if (error) throw new Error(`Failed to load versions: ${error.message}`)
    return (data ?? []).map(row => listRowSchema.parse({
        ...row,
        sections: Array.isArray((row.data as { sections?: unknown[] })?.sections) ? (row.data as { sections: { visible?: boolean }[] }).sections.filter(section => section.visible !== false).length : 0,
    }))
}

export async function getVersion (supabase: SupabaseClient, resumeId: string, versionId: string): Promise<(Snapshot & { id: string, name: string | null, created_at: string }) | null> {
    const { data, error } = await supabase
        .from("resume_versions")
        .select("id, name, title, template, design, data, created_at")
        .eq("resume_id", resumeId)
        .eq("id", versionId)
        .maybeSingle()
    if (error) throw new Error(`Failed to load version: ${error.message}`)
    if (!data) return null
    const document = parseResumeData(data.data)
    const design = designSchema.safeParse(data.design)
    return {
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        title: data.title,
        template: (TEMPLATES as readonly string[]).includes(data.template) ? data.template as TemplateKey : "professional",
        design: design.success ? design.data : DEFAULT_DESIGN,
        data: document.ok ? document.data : (data.data as ResumeData),
    }
}

// Takes a snapshot. Automatic snapshots skip unchanged content and reuse the latest
// automatic row if it's under 10 minutes old; named snapshots are always inserted.
export async function snapshotResume (supabase: SupabaseClient, resumeId: string, snapshot: Snapshot, name?: string): Promise<string | null> {
    const hash = contentHash(snapshot)
    const row = { resume_id: resumeId, title: snapshot.title, template: snapshot.template, design: snapshot.design, data: snapshot.data, content_hash: hash }

    if (name) {
        const { data, error } = await supabase.from("resume_versions").insert({ ...row, name }).select("id").single()
        if (error) throw new Error(`Failed to save version: ${error.message}`)
        return data.id
    }

    const { data: latest, error: latestError } = await supabase
        .from("resume_versions")
        .select("id, name, content_hash, created_at")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    if (latestError) throw new Error(`Failed to read versions: ${latestError.message}`)
    if (latest?.content_hash === hash) return latest.id

    let id: string
    if (latest && !latest.name && Date.now() - new Date(latest.created_at).getTime() < AUTO_WINDOW_MS) {
        const { error } = await supabase.from("resume_versions").update({ ...row, created_at: new Date().toISOString() }).eq("id", latest.id)
        if (error) throw new Error(`Failed to update version: ${error.message}`)
        id = latest.id
    } else {
        const { data, error } = await supabase.from("resume_versions").insert(row).select("id").single()
        if (error) throw new Error(`Failed to save version: ${error.message}`)
        id = data.id
    }

    // Prune automatic versions beyond the newest 50 (named ones are never pruned).
    const { data: old } = await supabase
        .from("resume_versions")
        .select("id")
        .eq("resume_id", resumeId)
        .is("name", null)
        .order("created_at", { ascending: false })
        .range(AUTO_KEEP, AUTO_KEEP + 200)
    const stale = (old ?? []).map(entry => entry.id)
    if (stale.length) {
        // Versions still used by a share link are kept (the delete would cascade to the link).
        const { data: shared } = await supabase.from("resume_shares").select("version_id").in("version_id", stale)
        const keep = new Set((shared ?? []).map(entry => entry.version_id))
        const remove = stale.filter(entry => !keep.has(entry))
        if (remove.length) await supabase.from("resume_versions").delete().in("id", remove)
    }
    return id
}
