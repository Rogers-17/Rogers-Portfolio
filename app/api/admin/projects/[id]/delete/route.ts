import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok } from "@/lib/admin/http"
import { revalidateProjects } from "@/lib/admin/revalidate"
import { uuidSchema } from "@/lib/admin/schemas"

type Context = { params: Promise<{ id: string }> }

export async function POST (request: Request, { params }: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) return fail(404, "not_found", "Project not found.")

    // Collect the project's image paths before the rows (and their references) are gone.
    const { data: project, error: readError } = await supabase
        .from("projects")
        .select("cover_image_path, project_features(image_path), project_images(image_path)")
        .eq("id", id.data)
        .maybeSingle()
    if (readError) return dbError(readError, "read project for delete")
    if (!project) return fail(404, "not_found", "Project not found.")

    const { error } = await supabase.from("projects").delete().eq("id", id.data)
    if (error) return dbError(error, "delete project")

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
    return ok({ id: id.data, deleted: true })
}
