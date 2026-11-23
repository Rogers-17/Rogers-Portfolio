import "server-only"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { contentToggleSchema } from "@/lib/admin/content-schemas"
import { reorderSchema, uuidSchema } from "@/lib/admin/schemas"
import { toResponse } from "@/lib/admin/actions/result"
import { createContent, deleteContent, reorderContent, toggleContent, updateContent, type ContentConfig } from "@/lib/admin/actions/content"

// Route handlers shared by simple, flat content tables (testimonials, experiences, about facts, gallery photos).
// The write logic lives in lib/admin/actions/content.ts so the AI assistant uses the same code.

export { aboutFactsConfig, experiencesConfig, galleryPhotosConfig, testimonialsConfig } from "@/lib/admin/actions/content"

type Context = { params: Promise<{ id: string }> }

async function parseId (context: Context) {
    return uuidSchema.safeParse((await context.params).id)
}

export function collectionHandlers (config: ContentConfig) {
    return {
        async GET (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            return ok(await config.list(auth.ctx.supabase))
        },

        async POST (request: Request) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response

            const parsed = await parseJson(request, config.inputSchema)
            if (!parsed.success) return parsed.response

            return toResponse(await createContent(auth.ctx.supabase, config, parsed.data), 201)
        },
    }
}

export function itemHandlers (config: ContentConfig) {
    const notFound = () => fail(404, "not_found", `${config.label} not found.`)

    return {
        async GET (request: Request, context: Context) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            const id = await parseId(context)
            if (!id.success) return notFound()

            const row = await config.get(auth.ctx.supabase, id.data)
            return row ? ok(row) : notFound()
        },

        async POST (request: Request, context: Context) {
            const auth = await requireAdminApi(request)
            if (!auth.ok) return auth.response
            const id = await parseId(context)
            if (!id.success) return notFound()

            const parsed = await parseJson(request, config.inputSchema)
            if (!parsed.success) return parsed.response

            return toResponse(await updateContent(auth.ctx.supabase, config, id.data, parsed.data))
        },
    }
}

export function deleteHandler (config: ContentConfig) {
    return async function POST (request: Request, context: Context) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response
        const id = await parseId(context)
        if (!id.success) return fail(404, "not_found", `${config.label} not found.`)

        return toResponse(await deleteContent(auth.ctx.supabase, config, id.data))
    }
}

export function toggleHandler (config: ContentConfig) {
    return async function POST (request: Request, context: Context) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response
        const id = await parseId(context)
        if (!id.success) return fail(404, "not_found", `${config.label} not found.`)

        const parsed = await parseJson(request, contentToggleSchema)
        if (!parsed.success) return parsed.response

        return toResponse(await toggleContent(auth.ctx.supabase, config, id.data, parsed.data.value))
    }
}

export function reorderHandler (config: ContentConfig) {
    return async function POST (request: Request) {
        const auth = await requireAdminApi(request)
        if (!auth.ok) return auth.response

        const parsed = await parseJson(request, reorderSchema)
        if (!parsed.success) return parsed.response

        return toResponse(await reorderContent(auth.ctx.supabase, config, parsed.data.ids))
    }
}
