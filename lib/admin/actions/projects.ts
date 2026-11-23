import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidateProjects } from "@/lib/admin/revalidate"
import type { ProjectInput, TechnologyInput } from "@/lib/admin/schemas"
import { dbFailure, failure, notFound, success, type ActionResult } from "@/lib/admin/actions/result"

// Projects and technologies: shared by the admin API routes and the AI assistant.

export async function saveProject (supabase: SupabaseClient, id: string | null, input: ProjectInput): Promise<ActionResult<{ id: string, slug: string }>> {
    const { data, error } = await supabase.rpc("admin_save_project", { p_id: id, payload: input })
    if (error) return dbFailure(error, id ? "update project" : "create project")

    revalidateProjects()
    return success({ id: id ?? (data as string), slug: input.slug })
}

export async function deleteProject (supabase: SupabaseClient, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    // Collect the project's image paths before the rows (and their references) are gone.
    const { data: project, error: readError } = await supabase
        .from("projects")
        .select("cover_image_path, project_features(image_path), project_images(image_path)")
        .eq("id", id)
        .maybeSingle()
    if (readError) return dbFailure(readError, "read project for delete")
    if (!project) return notFound("Project")

    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) return dbFailure(error, "delete project")

    const paths = [
        project.cover_image_path,
        ...project.project_features.map((feature: { image_path: string | null }) => feature.image_path),
        ...project.project_images.map((image: { image_path: string }) => image.image_path),
    ].filter((path): path is string => Boolean(path))

    if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from("project-images").remove(paths)
        if (storageError) console.error("[admin] project image cleanup failed:", storageError.message)
    }

    revalidateProjects()
    return success({ id, deleted: true })
}

export async function toggleProject (supabase: SupabaseClient, id: string, field: "is_published" | "is_featured", value: boolean): Promise<ActionResult<Record<string, unknown>>> {
    const { data, error } = await supabase.from("projects").update({ [field]: value }).eq("id", id).select("id")
    if (error) return dbFailure(error, "toggle project")
    if (!data?.length) return notFound("Project")

    revalidateProjects()
    return success({ id, [field]: value })
}

const TECH_COLUMNS = "id, name, slug, icon_path"

export async function createTechnology (supabase: SupabaseClient, input: TechnologyInput): Promise<ActionResult<{ id: string, name: string, slug: string, icon_path: string | null }>> {
    const { data, error } = await supabase.from("technologies").insert(input).select(TECH_COLUMNS).single()
    if (error) return dbFailure(error, "create technology")

    revalidateProjects()
    return success(data)
}

export async function updateTechnology (supabase: SupabaseClient, id: string, input: TechnologyInput): Promise<ActionResult<{ id: string, name: string, slug: string, icon_path: string | null }>> {
    const { data, error } = await supabase.from("technologies").update(input).eq("id", id).select(TECH_COLUMNS).maybeSingle()
    if (error) return dbFailure(error, "update technology")
    if (!data) return notFound("Technology")

    revalidateProjects()
    return success(data)
}

export async function deleteTechnology (supabase: SupabaseClient, id: string): Promise<ActionResult<{ id: string, deleted: true }>> {
    const { count, error: countError } = await supabase
        .from("project_technologies")
        .select("project_id", { count: "exact", head: true })
        .eq("technology_id", id)
    if (countError) return dbFailure(countError, "count technology usage")
    if (count) return failure(409, "in_use", `In use by ${count} project${count === 1 ? "" : "s"}. Remove it from those projects first.`)

    const { data, error } = await supabase.from("technologies").delete().eq("id", id).select("icon_path").maybeSingle()
    if (error) return dbFailure(error, "delete technology")
    if (!data) return notFound("Technology")

    if (data.icon_path) {
        const { error: storageError } = await supabase.storage.from("tech-icons").remove([data.icon_path])
        if (storageError) console.error("[admin] tech icon cleanup failed:", storageError.message)
    }

    revalidateProjects()
    return success({ id, deleted: true })
}
