import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import type { z } from "zod"

export type ApiIssue = { path: string, message: string }

export function ok<T> (data: T, status = 200) {
    return Response.json({ ok: true, data }, { status, headers: { "Cache-Control": "no-store" } })
}

export function fail (status: number, code: string, message: string, issues?: ApiIssue[]) {
    return Response.json({ ok: false, error: { code, message, issues } }, { status, headers: { "Cache-Control": "no-store" } })
}

export function zodIssues (error: z.ZodError): ApiIssue[] {
    return error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))
}

type Parsed<T> = { success: true, data: T } | { success: false, response: Response }

export async function parseJson<T extends z.ZodType> (request: Request, schema: T): Promise<Parsed<z.infer<T>>> {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return { success: false, response: fail(400, "invalid_json", "Request body must be valid JSON.") }
    }

    const result = schema.safeParse(body)
    if (!result.success) {
        return { success: false, response: fail(400, "validation_error", "Some fields are invalid.", zodIssues(result.error)) }
    }
    return { success: true, data: result.data }
}

// Maps database errors to safe client responses; details stay in the server log.
export function dbError (error: PostgrestError, context: string) {
    switch (error.code) {
        case "23505":
            return fail(409, "conflict", uniqueMessage(error))
        case "23503":
            return fail(409, "in_use", "This item is still referenced elsewhere.")
        case "42501":
            return fail(403, "forbidden", "You don't have permission to do that.")
        case "P0002":
            return fail(404, "not_found", "Not found.")
        case "22P02":
        case "23514":
            return fail(400, "invalid_input", "Some values are not allowed.")
        default:
            console.error(`[admin] ${context}:`, error)
            return fail(500, "server_error", "Something went wrong. Please try again.")
    }
}

function uniqueMessage (error: PostgrestError) {
    const text = `${error.message} ${error.details ?? ""}`
    if (text.includes("slug")) return "Slug already in use."
    if (text.includes("name")) return "Name already in use."
    return "That value is already in use."
}
