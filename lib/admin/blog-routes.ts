import "server-only"
import type { PostgrestError } from "@supabase/supabase-js"
import { dbError, fail } from "@/lib/admin/http"
import type { BlogPostInput } from "@/lib/admin/blog-schemas"
import { autoExcerpt, readingMinutes, toPlainText } from "@/lib/blog/content"

// Values derived from the body on every save (the client never sets them).
export function toPostRow (input: BlogPostInput) {
    const text = toPlainText(input.content)
    return {
        ...input,
        content_text: text.slice(0, 200_000),
        auto_excerpt: autoExcerpt(text),
        reading_minutes: readingMinutes(text),
    }
}

export function postDbError (error: PostgrestError, context: string) {
    if (error.code === "23505") return fail(409, "conflict", "Slug already in use.", [{ path: "slug", message: "Slug already in use" }])
    return dbError(error, context)
}
