import { z } from "zod"
import { extractText, getDocumentProxy } from "unpdf"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok } from "@/lib/admin/http"
import { AiError, generateJson } from "@/lib/ai/openrouter"
import { importMessages } from "@/lib/ai/prompts"
import { SECTION_TYPES, newId, parseResumeData } from "@/lib/resume/schema"

// POST /api/admin/ai/import: a PDF (multipart "file") or pasted text (JSON {"text"}) becomes
// a resume document for you to review. Nothing is saved here.

export const maxDuration = 60

const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_TEXT = 40_000
const MAX_PAGES = 12

// Loose shape from the model; ids are added here and the result goes through the real schema.
const aiDocument = z.object({
    contact: z.record(z.string(), z.unknown()).catch({}),
    sections: z.array(z.object({
        type: z.string(),
        title: z.string().max(80).catch(""),
        items: z.array(z.record(z.string(), z.unknown())).max(60).catch([]),
    })).max(30),
})

async function readPdf (file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new AiError(400, "invalid_type", "That file isn't a PDF.")
    const pdf = await getDocumentProxy(bytes)
    if (pdf.numPages > MAX_PAGES) throw new AiError(400, "too_long", `PDFs up to ${MAX_PAGES} pages are supported.`)
    const { text } = await extractText(pdf, { mergePages: true })
    return text
}

export async function POST (request: Request) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response

    try {
        let text: string
        if (request.headers.get("content-type")?.includes("multipart/form-data")) {
            if (Number(request.headers.get("content-length") ?? 0) > MAX_PDF_BYTES + 64 * 1024) return fail(413, "too_large", "PDF is too large (max 5 MB).")
            const form = await request.formData().catch(() => null)
            const file = form?.get("file")
            if (!(file instanceof File) || file.size === 0) return fail(400, "missing_file", "Choose a PDF to import.")
            if (file.size > MAX_PDF_BYTES) return fail(413, "too_large", "PDF is too large (max 5 MB).")
            text = await readPdf(file)
        } else {
            const body = await request.json().catch(() => null) as { text?: unknown } | null
            text = typeof body?.text === "string" ? body.text : ""
        }

        text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT)
        if (text.length < 80) {
            return fail(400, "no_text", "Couldn't find enough text. If the PDF is a scanned image, paste the text instead.")
        }

        const result = await generateJson({ supabase: auth.ctx.supabase, action: "import", schema: aiDocument, maxTokens: 8000, temperature: 0.1, messages: importMessages(text) })

        const contact = result.data.contact as Record<string, unknown>
        const details = Array.isArray(contact.details) ? (contact.details as Record<string, unknown>[]).slice(0, 8).map(detail => ({ ...detail, id: newId() })) : []
        const document = parseResumeData({
            contact: { ...contact, details, photoPath: null },
            sections: result.data.sections
                .filter(section => (SECTION_TYPES as string[]).includes(section.type))
                .map(section => ({
                    id: newId(),
                    type: section.type,
                    title: section.title,
                    visible: true,
                    note: "",
                    items: section.items.map(item => ({
                        ...Object.fromEntries(Object.entries(item).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 3000) : value])),
                        id: newId(),
                    })),
                })),
        })
        if (!document.ok) return fail(502, "ai_bad_output", `The imported CV couldn't be structured (${document.message}). Try again or paste the text.`)

        return ok({ data: document.data, usage: result.usage, characters: text.length })
    } catch (error) {
        if (error instanceof AiError) return fail(error.status, error.code, error.message)
        console.error("[ai] import failed:", error)
        return fail(500, "server_error", "Couldn't read that file. Try pasting the text instead.")
    }
}
