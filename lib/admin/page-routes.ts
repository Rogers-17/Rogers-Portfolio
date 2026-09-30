import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { dbError, fail, ok, parseJson } from "@/lib/admin/http"

// GET/POST handlers for single-row page tables (id = 1). The row is created by the seed;
// updates never accept an id, and a missing row is reported instead of silently inserted.

type SingletonConfig = {
    table: "about_page" | "gallery_page" | "project_form_settings"
    label: string
    inputSchema: z.ZodType<Record<string, unknown>>
    get: (supabase: SupabaseClient) => Promise<unknown>
    revalidate: () => void
}

export function singletonHandlers (config: SingletonConfig) {
    return {
        async GET (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            return ok(await config.get(auth.ctx.supabase))
        },

        async POST (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response

            const parsed = await parseJson(request, config.inputSchema)
            if (!parsed.success) return parsed.response

            const { data, error } = await auth.ctx.supabase.from(config.table).update(parsed.data).eq("id", 1).select("id")
            if (error) return dbError(error, `update ${config.table}`)
            if (!data?.length) {
                return fail(404, "not_seeded", `${config.label} row is missing. Run supabase/seed_about_gallery_project_form.sql first.`)
            }

            config.revalidate()
            return ok({ saved: true })
        },
    }
}
