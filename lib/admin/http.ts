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

export type DbFailure = { status: number, code: string, message: string }

// Maps database errors to safe client-facing values; details stay in the server log.
export function mapDbError (error: PostgrestError, context: string): DbFailure {
    switch (error.code) {
        case "23505":
            return { status: 409, code: "conflict", message: uniqueMessage(error) }
        case "23503":
            return { status: 409, code: "in_use", message: "This item is still referenced elsewhere." }
        case "42501":
            return { status: 403, code: "forbidden", message: "You don't have permission to do that." }
        case "P0002":
            return { status: 404, code: "not_found", message: "Not found." }
        case "22P02":
        case "23514":
            return { status: 400, code: "invalid_input", message: "Some values are not allowed." }
        default:
            console.error(`[admin] ${context}:`, error)
            return { status: 500, code: "server_error", message: "Something went wrong. Please try again." }
    }
}

export function dbError (error: PostgrestError, context: string) {
    const mapped = mapDbError(error, context)
    return fail(mapped.status, mapped.code, mapped.message)
}

function uniqueMessage (error: PostgrestError) {
    const text = `${error.message} ${error.details ?? ""}`
    if (text.includes("slug")) return "Slug already in use."
    if (text.includes("name")) return "Name already in use."
    return "That value is already in use."
}
