"use client"

import * as React from "react"
import { LuLoaderCircle, LuSendHorizontal, LuSparkles } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import { PanelHeading } from "@/components/resume/controls"
import { useAi } from "@/components/resume/ai/context"

type Message = { role: "you" | "copilot", text: string }

const STARTERS = [
    "What are the three weakest parts of this resume?",
    "Which skills should I add for the target role?",
    "Is my experience section too long?",
    "How can I explain my career gap?",
]

// Free-form questions about the resume open in the editor. Answers are advice only; nothing
// is changed automatically.
export default function CopilotPanel () {
    const ai = useAi()
    const [messages, setMessages] = React.useState<Message[]>([])
    const [question, setQuestion] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const limited = ai?.usage ? ai.usage.used >= ai.usage.limit : false

    async function ask (text: string) {
        const trimmed = text.trim()
        if (!ai || !trimmed || loading) return
        const history = messages.slice(-6)
        setMessages(current => [...current, { role: "you", text: trimmed }])
        setQuestion("")
        setLoading(true)
        const result = await ai.request<{ answer: string }>("ask", { question: trimmed, resume: ai.resumeText(), targetRole: ai.targetRole, jobDescription: ai.jobDescription, history })
        setLoading(false)
        setMessages(current => [...current, { role: "copilot", text: result.ok ? result.data.answer : `⚠ ${result.error.message}` }])
    }

    return (
        <div className="flex min-h-[60vh] flex-col">
            <PanelHeading title="Ask Copilot" subtitle="Ask anything about this resume. It sees the current content, target role and job description." />
            <div className="flex flex-1 flex-col gap-3" aria-live="polite">
                {messages.length === 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {STARTERS.map(starter => (
                            <button key={starter} type="button" onClick={() => ask(starter)} disabled={limited} className="rounded-xl border border-white/8 bg-white/2 p-3 text-left text-sm text-fg/85 hover:border-accent-1 disabled:opacity-40">
                                <LuSparkles className="mb-1.5 text-accent-1" aria-hidden="true" />
                                {starter}
                            </button>
                        ))}
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${message.role === "you" ? "self-end bg-accent-1/15 text-fg" : "self-start border border-white/6 bg-white/3 text-fg/90"}`}>
                        {message.text}
                    </div>
                ))}
                {loading && <p className="flex items-center gap-2 text-sm text-muted"><LuLoaderCircle className="animate-spin" aria-hidden="true" /> Thinking…</p>}
            </div>
            <form onSubmit={event => { event.preventDefault(); void ask(question) }} className="mt-6 flex gap-2">
                <input aria-label="Ask a question" value={question} maxLength={1000} onChange={event => setQuestion(event.target.value)} placeholder={limited ? "Daily AI limit reached" : "Ask about your resume…"} disabled={limited} className={inputClass} />
                <button type="submit" disabled={!question.trim() || loading || limited} aria-label="Send" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 text-white disabled:opacity-50">
                    <LuSendHorizontal aria-hidden="true" />
                </button>
            </form>
        </div>
    )
}
