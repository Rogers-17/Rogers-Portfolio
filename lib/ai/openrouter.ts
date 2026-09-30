import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { z } from "zod"
import { aiRequestsToday, getResumeSettings } from "@/lib/resume/queries"

// Server-only OpenRouter client (OpenAI-compatible chat completions, JSON mode).
// The API key never leaves the server. Every call is logged and counted against the
// daily limit in resume_settings.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const TIMEOUT_MS = 60_000

export type AiMessage = { role: "system" | "user" | "assistant", content: string }

export class AiError extends Error {
    constructor (public status: number, public code: string, message: string) {
        super(message)
    }
}

type Usage = { used: number, limit: number, model: string }

function apiKey () {
    const key = process.env.OPEN_ROUTER_API_KEY
    if (!key) throw new AiError(503, "ai_not_configured", "AI isn't configured. Add OPEN_ROUTER_API_KEY to the environment.")
    return key
}

async function log (supabase: SupabaseClient, entry: { action: string, model: string, ok: boolean, prompt_tokens?: number, completion_tokens?: number, cost_usd?: number }) {
    const { error } = await supabase.from("ai_requests").insert(entry)
    if (error) console.error("[ai] usage log failed:", error.message)
}

// Models sometimes wrap JSON in ```json fences or add a sentence around it.
function extractJson (content: string): unknown {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const raw = (fenced ? fenced[1] : content).trim()
    const start = raw.search(/[{[]/)
    const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"))
    if (start === -1 || end === -1) throw new Error("No JSON in response")
    return JSON.parse(raw.slice(start, end + 1))
}

type Options<T extends z.ZodType> = {
    supabase: SupabaseClient
    action: string
    messages: AiMessage[]
    schema: T
    maxTokens: number
    temperature?: number
}

export async function generateJson<T extends z.ZodType> ({ supabase, action, messages, schema, maxTokens, temperature = 0.5 }: Options<T>): Promise<{ data: z.infer<T>, usage: Usage }> {
    const key = apiKey()
    const settings = await getResumeSettings(supabase)
    const used = await aiRequestsToday(supabase)
    if (used >= settings.daily_ai_limit) {
        throw new AiError(429, "ai_limit", `Daily AI limit reached (${settings.daily_ai_limit}). It resets at midnight UTC; you can raise it in Resume settings.`)
    }

    let conversation = [...messages]
    let calls = 0

    // One retry when the model returns invalid JSON or the wrong shape.
    for (let attempt = 0; attempt < 2; attempt++) {
        let response: Response
        try {
            response = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://rogers-portfolio.vercel.app",
                    "X-Title": "Rogers Portfolio Resume Builder",
                },
                body: JSON.stringify({
                    model: settings.ai_model,
                    messages: conversation,
                    max_tokens: maxTokens,
                    temperature,
                    response_format: { type: "json_object" },
                    usage: { include: true },
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
                cache: "no-store",
            })
        } catch (error) {
            await log(supabase, { action, model: settings.ai_model, ok: false })
            const timedOut = error instanceof Error && error.name === "TimeoutError"
            throw new AiError(504, "ai_timeout", timedOut ? "The AI took too long to answer. Try again." : "Couldn't reach the AI service. Check your connection and try again.")
        }
        calls++

        const payload = await response.json().catch(() => null) as null | {
            choices?: { message?: { content?: string } }[]
            usage?: { prompt_tokens?: number, completion_tokens?: number, cost?: number }
            error?: { message?: string, code?: number | string }
        }

        if (!response.ok || !payload) {
            await log(supabase, { action, model: settings.ai_model, ok: false })
            console.error("[ai] OpenRouter error:", response.status, payload?.error?.message)
            if (response.status === 401) throw new AiError(502, "ai_auth", "The OpenRouter API key was rejected. Check OPEN_ROUTER_API_KEY.")
            if (response.status === 402) throw new AiError(402, "ai_credits", "Your OpenRouter account is out of credits.")
            if (response.status === 429) throw new AiError(429, "ai_busy", "The AI service is busy. Wait a moment and try again.")
            if (response.status === 400 || response.status === 404) throw new AiError(502, "ai_model", `The model "${settings.ai_model}" rejected the request. Check the model in Resume settings.`)
            throw new AiError(502, "ai_failed", "The AI service returned an error. Try again.")
        }

        await log(supabase, {
            action,
            model: settings.ai_model,
            ok: true,
            prompt_tokens: payload.usage?.prompt_tokens,
            completion_tokens: payload.usage?.completion_tokens,
            cost_usd: payload.usage?.cost,
        })

        const content = payload.choices?.[0]?.message?.content ?? ""
        try {
            const parsed = schema.safeParse(extractJson(content))
            if (parsed.success) {
                return { data: parsed.data, usage: { used: used + calls, limit: settings.daily_ai_limit, model: settings.ai_model } }
            }
            conversation = [...conversation, { role: "assistant", content }, { role: "user", content: `That JSON didn't match the required shape (${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}). Reply again with ONLY the corrected JSON.` }]
        } catch {
            conversation = [...conversation, { role: "assistant", content }, { role: "user", content: "That wasn't valid JSON. Reply again with ONLY the JSON object, no other text." }]
        }
    }

    throw new AiError(502, "ai_bad_output", "The AI returned an unexpected answer. Try again, or try a different model in Resume settings.")
}

export async function usageSummary (supabase: SupabaseClient): Promise<Usage> {
    const [settings, used] = await Promise.all([getResumeSettings(supabase), aiRequestsToday(supabase)])
    return { used, limit: settings.daily_ai_limit, model: settings.ai_model }
}
