// Client-safe: the Tiptap JSON allowlist used by the editor (client), the admin API (server)
// and the public renderer. Anything not listed here is rejected; allowed nodes/marks are
// rebuilt with only their known attributes, so stray attributes never reach the database.

export type BlogMark =
    | { type: "bold" | "italic" | "underline" | "strike" | "code" }
    | { type: "link", attrs: { href: string } }

export type BlogNode =
    | { type: "doc", content: BlogNode[] }
    | { type: "paragraph", content?: BlogNode[] }
    | { type: "heading", attrs: { level: 2 | 3 }, content?: BlogNode[] }
    | { type: "text", text: string, marks?: BlogMark[] }
    | { type: "hardBreak" }
    | { type: "bulletList", content: BlogNode[] }
    | { type: "orderedList", attrs: { start: number }, content: BlogNode[] }
    | { type: "listItem", content: BlogNode[] }
    | { type: "blockquote", content: BlogNode[] }
    | { type: "codeBlock", attrs: { language: string | null }, content?: BlogNode[] }
    | { type: "horizontalRule" }
    | { type: "image", attrs: { src: string, alt: string, width: number | null, height: number | null } }

export type BlogDoc = Extract<BlogNode, { type: "doc" }>

export const MAX_NODES = 5000
export const MAX_DEPTH = 20
export const MAX_CONTENT_BYTES = 500_000

export const EMPTY_DOC: BlogDoc = { type: "doc", content: [{ type: "paragraph" }] }

const SIMPLE_MARKS = new Set(["bold", "italic", "underline", "strike", "code"])
const CONTAINER_NODES = new Set(["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock"])

// Images must be uploads in our public bucket's blog/ folder.
export function blogImagePrefix () {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/blog/`
}

export function isAllowedImageSrc (src: string) {
    const prefix = blogImagePrefix()
    return src.startsWith(prefix) && /^[a-z0-9-]+\.(?:png|jpe?g|webp|avif|gif)$/.test(src.slice(prefix.length))
}

export function isAllowedHref (href: string) {
    if (href.length > 2000) return false
    if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return true
    try {
        const url = new URL(href)
        return url.protocol === "https:" || url.protocol === "http:"
    } catch {
        return false
    }
}

type Result = { ok: true, doc: BlogDoc } | { ok: false, message: string }

class InvalidContent extends Error {}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

export function sanitizeDoc (input: unknown): Result {
    let count = 0

    function marks (value: unknown): BlogMark[] | undefined {
        if (value === undefined) return undefined
        if (!Array.isArray(value) || value.length > 10) throw new InvalidContent("Invalid text formatting.")
        const result: BlogMark[] = []
        for (const mark of value) {
            if (!isObject(mark) || typeof mark.type !== "string") throw new InvalidContent("Invalid text formatting.")
            if (SIMPLE_MARKS.has(mark.type)) {
                result.push({ type: mark.type as "bold" })
            } else if (mark.type === "link") {
                const href = isObject(mark.attrs) ? mark.attrs.href : undefined
                if (typeof href !== "string" || !isAllowedHref(href.trim())) throw new InvalidContent("Links must start with https://, http:// or mailto:.")
                result.push({ type: "link", attrs: { href: href.trim() } })
            } else {
                throw new InvalidContent(`Formatting "${mark.type}" isn't allowed.`)
            }
        }
        return result.length ? result : undefined
    }

    function children (value: unknown, depth: number): BlogNode[] | undefined {
        if (value === undefined) return undefined
        if (!Array.isArray(value)) throw new InvalidContent("Invalid content structure.")
        return value.map(child => node(child, depth + 1))
    }

    function node (value: unknown, depth: number): BlogNode {
        if (++count > MAX_NODES) throw new InvalidContent("The post is too long.")
        if (depth > MAX_DEPTH) throw new InvalidContent("Content is nested too deeply.")
        if (!isObject(value) || typeof value.type !== "string") throw new InvalidContent("Invalid content structure.")
        const attrs = isObject(value.attrs) ? value.attrs : {}
        const content = CONTAINER_NODES.has(value.type) ? children(value.content, depth) : undefined

        switch (value.type) {
            case "doc":
                // Only valid as the root; a nested "doc" is rejected.
                if (depth !== 0) throw new InvalidContent("Invalid content structure.")
                return { type: "doc", content: content ?? [] }
            case "text": {
                if (typeof value.text !== "string" || value.text.length === 0 || value.text.length > 20000) throw new InvalidContent("Invalid text.")
                const textMarks = marks(value.marks)
                return textMarks ? { type: "text", text: value.text, marks: textMarks } : { type: "text", text: value.text }
            }
            case "paragraph":
                return content?.length ? { type: "paragraph", content } : { type: "paragraph" }
            case "heading": {
                const level = attrs.level === 3 ? 3 : 2
                return content?.length ? { type: "heading", attrs: { level }, content } : { type: "heading", attrs: { level } }
            }
            case "hardBreak":
                return { type: "hardBreak" }
            case "horizontalRule":
                return { type: "horizontalRule" }
            case "bulletList":
                return { type: "bulletList", content: content ?? [] }
            case "orderedList": {
                const start = typeof attrs.start === "number" && Number.isInteger(attrs.start) && attrs.start > 0 && attrs.start < 10000 ? attrs.start : 1
                return { type: "orderedList", attrs: { start }, content: content ?? [] }
            }
            case "listItem":
                return { type: "listItem", content: content ?? [] }
            case "blockquote":
                return { type: "blockquote", content: content ?? [] }
            case "codeBlock": {
                const language = typeof attrs.language === "string" && /^[a-z0-9+#-]{1,20}$/i.test(attrs.language) ? attrs.language : null
                return content?.length ? { type: "codeBlock", attrs: { language }, content } : { type: "codeBlock", attrs: { language } }
            }
            case "image": {
                const src = typeof attrs.src === "string" ? attrs.src : ""
                const alt = typeof attrs.alt === "string" ? attrs.alt.trim().slice(0, 200) : ""
                if (!isAllowedImageSrc(src)) throw new InvalidContent("Images must be uploaded through the editor.")
                if (!alt) throw new InvalidContent("Every image needs a description (alt text).")
                const size = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 10000 ? value : null)
                const width = size(attrs.width)
                const height = size(attrs.height)
                return { type: "image", attrs: { src, alt, width: width && height ? width : null, height: width && height ? height : null } }
            }
            default:
                throw new InvalidContent(`Block type "${value.type}" isn't allowed.`)
        }
    }

    try {
        if (!isObject(input) || input.type !== "doc") return { ok: false, message: "Invalid document." }
        if (JSON.stringify(input).length > MAX_CONTENT_BYTES) return { ok: false, message: "The post is too large." }
        const doc = node(input, 0) as BlogDoc
        return { ok: true, doc: { type: "doc", content: doc.content ?? [] } }
    } catch (error) {
        if (error instanceof InvalidContent) return { ok: false, message: error.message }
        throw error
    }
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

const BLOCKS = new Set(["paragraph", "heading", "listItem", "blockquote", "codeBlock"])

export function toPlainText (doc: BlogNode): string {
    const parts: string[] = []
    const walk = (node: BlogNode) => {
        if (node.type === "text") parts.push(node.text)
        else if (node.type === "hardBreak") parts.push(" ")
        if ("content" in node && node.content) node.content.forEach(walk)
        if (BLOCKS.has(node.type)) parts.push("\n")
    }
    walk(doc)
    return parts.join("").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim()
}

export const WORDS_PER_MINUTE = 220

export function readingMinutes (text: string) {
    const words = text.split(/\s+/).filter(Boolean).length
    return Math.min(240, Math.max(1, Math.round(words / WORDS_PER_MINUTE)))
}

export function autoExcerpt (text: string, max = 180) {
    const flat = text.replace(/\s+/g, " ").trim()
    if (flat.length <= max) return flat
    const cut = flat.slice(0, max)
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`
}

export function hasText (doc: BlogNode) {
    return toPlainText(doc).length > 0
}
