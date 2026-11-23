import "server-only"
import { isAllowedHref, isAllowedImageSrc, type BlogDoc } from "@/lib/blog/content"

// Minimal Markdown <-> blog document (Tiptap JSON) conversion for the AI assistant.
// Only produces nodes that lib/blog/content.ts allows; the result is still passed through
// blogContentSchema (sanitizeDoc) before it is saved.

type Mark = { type: "bold" | "italic" | "strike" | "code" } | { type: "link", attrs: { href: string } }
type Node = { type: string, text?: string, marks?: Mark[], attrs?: Record<string, unknown>, content?: Node[] }

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(~~[^~\n]+?~~)|(\*[^*\s][^*\n]*?\*)|(_[^_\s][^_\n]*?_)|(\[[^\]\n]+\]\([^)\s]+\))/

function inline (text: string, marks: Mark[] = []): Node[] {
    const out: Node[] = []
    const pushText = (value: string, extra: Mark[] = marks) => {
        if (!value) return
        out.push(extra.length ? { type: "text", text: value, marks: extra } : { type: "text", text: value })
    }

    let rest = text
    while (rest) {
        const match = INLINE.exec(rest)
        if (!match) {
            pushText(rest)
            break
        }
        pushText(rest.slice(0, match.index))
        const token = match[0]
        if (match[1]) pushText(token.slice(1, -1), [...marks, { type: "code" }])
        else if (match[2] || match[3]) out.push(...inline(token.slice(2, -2), [...marks, { type: "bold" }]))
        else if (match[4]) out.push(...inline(token.slice(2, -2), [...marks, { type: "strike" }]))
        else if (match[5] || match[6]) out.push(...inline(token.slice(1, -1), [...marks, { type: "italic" }]))
        else if (match[7]) {
            const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? []
            if (label && href && isAllowedHref(href)) out.push(...inline(label, [...marks, { type: "link", attrs: { href } }]))
            else pushText(token)
        }
        rest = rest.slice(match.index + token.length)
    }
    return out
}

const paragraph = (text: string): Node => {
    const content = inline(text.trim())
    return content.length ? { type: "paragraph", content } : { type: "paragraph" }
}

const LIST_ITEM = /^\s*(?:([-*+])|(\d{1,4})[.)])\s+(.*)$/
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/

function blocks (lines: string[]): Node[] {
    const out: Node[] = []
    let i = 0

    while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()

        if (!trimmed) {
            i++
            continue
        }

        // Fenced code block
        const fence = trimmed.match(/^```\s*([a-z0-9+#-]{0,20})\s*$/i)
        if (fence) {
            const code: string[] = []
            i++
            while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++])
            i++
            const text = code.join("\n")
            out.push({ type: "codeBlock", attrs: { language: fence[1] || null }, ...(text ? { content: [{ type: "text", text }] } : {}) })
            continue
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
            const content = inline(heading[2].trim())
            out.push({ type: "heading", attrs: { level: heading[1].length >= 3 ? 3 : 2 }, ...(content.length ? { content } : {}) })
            i++
            continue
        }

        if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            out.push({ type: "horizontalRule" })
            i++
            continue
        }

        const image = trimmed.match(IMAGE)
        if (image && isAllowedImageSrc(image[2]) && image[1].trim()) {
            out.push({ type: "image", attrs: { src: image[2], alt: image[1].trim().slice(0, 200), width: null, height: null } })
            i++
            continue
        }

        if (trimmed.startsWith(">")) {
            const quoted: string[] = []
            while (i < lines.length && lines[i].trim().startsWith(">")) quoted.push(lines[i++].trim().replace(/^>\s?/, ""))
            out.push({ type: "blockquote", content: blocks(quoted) })
            continue
        }

        const item = line.match(LIST_ITEM)
        if (item) {
            const ordered = Boolean(item[2])
            const start = ordered ? Number(item[2]) : 1
            const items: Node[] = []
            while (i < lines.length) {
                const current = lines[i].match(LIST_ITEM)
                if (!current || Boolean(current[2]) !== ordered) break
                items.push({ type: "listItem", content: [paragraph(current[3])] })
                i++
            }
            out.push(ordered ? { type: "orderedList", attrs: { start: start > 0 ? start : 1 }, content: items } : { type: "bulletList", content: items })
            continue
        }

        // Paragraph: consecutive plain lines joined with a space.
        const text: string[] = []
        while (i < lines.length) {
            const next = lines[i].trim()
            if (!next || /^(```|#{1,6}\s|>)/.test(next) || LIST_ITEM.test(lines[i]) || /^(?:-{3,}|\*{3,}|_{3,})$/.test(next)) break
            text.push(next)
            i++
        }
        out.push(paragraph(text.join(" ")))
    }

    return out
}

export function markdownToDoc (markdown: string): BlogDoc {
    const content = blocks(markdown.replace(/\r\n?/g, "\n").split("\n"))
    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] } as BlogDoc
}

// ---------------------------------------------------------------------------
// Document -> Markdown (so the assistant can read and rewrite an existing post)
// ---------------------------------------------------------------------------

function inlineToMarkdown (nodes: Node[] = []): string {
    return nodes.map(node => {
        if (node.type === "hardBreak") return "  \n"
        if (node.type !== "text" || !node.text) return ""
        let text = node.text
        const marks = node.marks ?? []
        if (marks.some(mark => mark.type === "code")) text = `\`${text}\``
        if (marks.some(mark => mark.type === "italic")) text = `*${text}*`
        if (marks.some(mark => mark.type === "bold")) text = `**${text}**`
        if (marks.some(mark => mark.type === "strike")) text = `~~${text}~~`
        const link = marks.find(mark => mark.type === "link")
        if (link && "attrs" in link) text = `[${text}](${link.attrs.href})`
        return text
    }).join("")
}

function blockToMarkdown (node: Node): string {
    switch (node.type) {
        case "paragraph":
            return inlineToMarkdown(node.content)
        case "heading":
            return `${node.attrs?.level === 3 ? "###" : "##"} ${inlineToMarkdown(node.content)}`
        case "horizontalRule":
            return "---"
        case "codeBlock":
            return `\`\`\`${(node.attrs?.language as string | null) ?? ""}\n${node.content?.map(child => child.text ?? "").join("") ?? ""}\n\`\`\``
        case "image":
            return `![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""})`
        case "blockquote":
            return (node.content ?? []).map(blockToMarkdown).join("\n\n").split("\n").map(line => `> ${line}`).join("\n")
        case "bulletList":
        case "orderedList": {
            const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1
            return (node.content ?? []).map((item, index) => {
                const text = (item.content ?? []).map(blockToMarkdown).join(" ")
                return node.type === "bulletList" ? `- ${text}` : `${start + index}. ${text}`
            }).join("\n")
        }
        default:
            return ""
    }
}

export function docToMarkdown (doc: unknown): string {
    const root = doc as Node
    return (root?.content ?? []).map(blockToMarkdown).filter(Boolean).join("\n\n")
}
