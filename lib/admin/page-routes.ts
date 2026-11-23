import "server-only"
import { requireAdminApi } from "@/lib/admin/auth"
import { ok, parseJson } from "@/lib/admin/http"
import { toResponse } from "@/lib/admin/actions/result"
import { updateSingleton, type SingletonConfig } from "@/lib/admin/actions/singletons"

// GET/POST handlers for single-row page tables (id = 1). The write logic lives in
// lib/admin/actions/singletons.ts so the AI assistant uses the same code.

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

            return toResponse(await updateSingleton(auth.ctx.supabase, config, parsed.data))
        },
    }
}
