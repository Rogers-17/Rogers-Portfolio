import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, ok, parseJson } from "@/lib/admin/http"
import { listJobs } from "@/lib/jobs/queries"
import { jobInputSchema } from "@/lib/jobs/schema"

// GET /api/admin/jobs?archived=1 · POST creates an application at the top of its column.
export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    return ok(await listJobs(auth.ctx.supabase, new URL(request.url).searchParams.get("archived") === "1"))
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx
    const parsed = await parseJson(request, jobInputSchema)
    if (!parsed.success) return parsed.response

    const { data: first } = await supabase
        .from("job_applications")
        .select("sort_order")
        .eq("status", parsed.data.status)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle()

    const { data, error } = await supabase
        .from("job_applications")
        .insert({ ...parsed.data, sort_order: (first?.sort_order ?? 1) - 1 })
        .select("id")
        .single()
    if (error) return dbError(error, "create application")
    return ok({ id: data.id }, 201)
}
