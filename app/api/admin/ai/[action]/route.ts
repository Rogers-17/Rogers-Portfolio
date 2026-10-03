import { z } from "zod"
import { requireAdminApi } from "@/lib/admin/auth"
import { fail, ok, parseJson } from "@/lib/admin/http"
import { uuidSchema } from "@/lib/admin/schemas"
import { AiError, generateJson } from "@/lib/ai/openrouter"
import { askMessages, bulletsMessages, coverLetterMessages, rewriteMessages, summaryMessages, tailorMessages } from "@/lib/ai/prompts"
import { newId, parseResumeData, tailorKeywordSchema } from "@/lib/resume/schema"

// POST /api/admin/ai/<action>: rewrite | summary | bullets | tailor | ask | cover-letter.
// Admin only, validated input caps, JSON output validated before it reaches the browser.

export const maxDuration = 60

const short = (max: number) => z.string().max(max).optional().default("")
const options = z.object({ options: z.array(z.string().trim().min(1).max(3000)).min(1).max(5) })

const inputs = {
    rewrite: z.object({
        text: z.string().trim().min(1, "Nothing to rewrite").max(3000),
        mode: z.enum(["improve", "quantify", "shorten", "formal", "grammar"]),
        context: z.object({ kind: z.enum(["summary", "bullet"]), role: short(120), company: short(160), targetRole: short(120) }).partial({ role: true, company: true, targetRole: true }),
    }),
    summary: z.object({ resume: z.string().min(20, "Add some content first").max(40000), targetRole: short(120), jobDescription: short(20000) }),
    bullets: z.object({ role: z.string().trim().min(1, "Add a job title first").max(120), company: short(160), notes: short(1000), existing: z.array(z.string().max(600)).max(25).default([]), targetRole: short(120), jobDescription: short(20000) }),
    tailor: z.object({ resumeId: uuidSchema.optional(), data: z.unknown(), jobDescription: z.string().trim().min(80, "Paste more of the job description").max(20000), jobCompany: short(120), targetRole: short(120) }),
    ask: z.object({
        question: z.string().trim().min(2).max(1000),
        resume: z.string().max(40000),
        targetRole: short(120),
        jobDescription: short(20000),
        history: z.array(z.object({ role: z.enum(["you", "copilot"]), text: z.string().max(4000) })).max(6).default([]),
    }),
    "cover-letter": z.object({
        resume: z.string().min(20, "Link a resume with some content").max(40000),
        company: short(120),
        jobTitle: short(120),
        recipient: short(600),
        jobDescription: short(20000),
        tone: z.enum(["professional", "warm", "confident", "concise"]).default("professional"),
        notes: short(1000),
    }),
} as const

type Action = keyof typeof inputs

const suggestionSchema = z.object({
    kind: z.enum(["summary", "bullet"]),
    sectionId: z.string().max(40),
    itemId: z.string().max(40),
    index: z.number().int().min(0).max(40).catch(0),
    before: z.string().max(3000).catch(""),
    after: z.string().trim().min(1).max(3000),
    reason: z.string().max(400).catch(""),
})

const tailorOutput = z.object({
    keywords: z.array(tailorKeywordSchema).max(30).catch([]),
    suggestions: z.array(suggestionSchema.catch(null as never)).max(20).catch([]),
    advice: z.array(z.string().max(400)).max(6).catch([]),
})

type Context = { params: Promise<{ action: string }> }

export async function POST (request: Request, context: Context) {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth.ctx

    const action = (await context.params).action
    if (!(action in inputs)) return fail(404, "not_found", "Unknown AI action.")

    const parsed = await parseJson(request, inputs[action as Action])
    if (!parsed.success) return parsed.response

    try {
        switch (action as Action) {
            case "rewrite": {
                const input = parsed.data as z.infer<typeof inputs.rewrite>
                const result = await generateJson({ supabase, action, schema: options, maxTokens: 900, temperature: 0.7, messages: rewriteMessages({ text: input.text, mode: input.mode, kind: input.context.kind, role: input.context.role, company: input.context.company, targetRole: input.context.targetRole }) })
                return ok({ options: result.data.options.slice(0, 3), usage: result.usage })
            }
            case "summary": {
                const input = parsed.data as z.infer<typeof inputs.summary>
                const result = await generateJson({ supabase, action, schema: options, maxTokens: 900, temperature: 0.7, messages: summaryMessages(input) })
                return ok({ options: result.data.options.slice(0, 3), usage: result.usage })
            }
            case "bullets": {
                const input = parsed.data as z.infer<typeof inputs.bullets>
                const schema = z.object({ bullets: z.array(z.string().trim().min(1).max(600)).min(1).max(8) })
                const result = await generateJson({ supabase, action, schema, maxTokens: 1000, temperature: 0.7, messages: bulletsMessages(input) })
                return ok({ bullets: result.data.bullets.map(bullet => bullet.replace(/^[-•*]\s*/, "")), usage: result.usage })
            }
            case "tailor": {
                const input = parsed.data as z.infer<typeof inputs.tailor>
                const document = parseResumeData(input.data)
                if (!document.ok) return fail(400, "validation_error", document.message)
                const result = await generateJson({ supabase, action, schema: tailorOutput, maxTokens: 3500, temperature: 0.4, messages: tailorMessages({ resumeJson: JSON.stringify(document.data.sections), jobDescription: input.jobDescription, jobCompany: input.jobCompany, targetRole: input.targetRole }) })

                // Keep only suggestions that point at real content and actually change it.
                const suggestions = result.data.suggestions.filter(Boolean).filter(suggestion => {
                    const section = document.data.sections.find(entry => entry.id === suggestion.sectionId)
                    const item = section?.items.find(entry => entry.id === suggestion.itemId) as Record<string, unknown> | undefined
                    if (!item) return false
                    const current = suggestion.kind === "summary" ? item.text : (item.bullets as string[] | undefined)?.[suggestion.index]
                    if (typeof current !== "string" || current.trim() === suggestion.after.trim()) return false
                    suggestion.before = current
                    return true
                }).map(suggestion => ({ ...suggestion, id: newId() }))

                const keywords = result.data.keywords.slice(0, 20)
                if (input.resumeId) {
                    const { error } = await supabase.from("resumes").update({ tailor_keywords: keywords, job_description: input.jobDescription, job_company: input.jobCompany || null }).eq("id", input.resumeId)
                    if (error) console.error("[ai] save tailor keywords failed:", error.message)
                }
                return ok({ keywords, suggestions, advice: result.data.advice, usage: result.usage })
            }
            case "ask": {
                const input = parsed.data as z.infer<typeof inputs.ask>
                const result = await generateJson({ supabase, action, schema: z.object({ answer: z.string().trim().min(1).max(4000) }), maxTokens: 700, temperature: 0.5, messages: askMessages(input) })
                return ok({ answer: result.data.answer, usage: result.usage })
            }
            case "cover-letter": {
                const input = parsed.data as z.infer<typeof inputs["cover-letter"]>
                const result = await generateJson({ supabase, action, schema: z.object({ body: z.string().trim().min(50).max(10000) }), maxTokens: 1500, temperature: 0.6, messages: coverLetterMessages(input) })
                return ok({ body: result.data.body, usage: result.usage })
            }
        }
    } catch (error) {
        if (error instanceof AiError) return fail(error.status, error.code, error.message)
        console.error(`[ai] ${action} failed:`, error)
        return fail(500, "server_error", "Something went wrong. Please try again.")
    }
    return fail(404, "not_found", "Unknown AI action.")
}
