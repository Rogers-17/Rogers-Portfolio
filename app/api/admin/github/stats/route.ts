import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"
import { getGitHubStats } from "@/lib/github/stats"

export const dynamic = "force-dynamic"

export async function GET (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const parsed = z.coerce.number().int().min(2008).max(new Date().getUTCFullYear()).safeParse(new URL(request.url).searchParams.get("year") ?? new Date().getUTCFullYear())
    if (!parsed.success) return fail(400, "invalid_year", "Choose a valid contribution year.")
    try {
        return ok(await getGitHubStats(parsed.data))
    } catch (error) {
        console.error("[github] stats query failed:", error instanceof Error ? error.message : error)
        return fail(502, "github_unavailable", "GitHub couldn't load these stats. Check the token's profile and contribution read access, then try again.")
    }
}
