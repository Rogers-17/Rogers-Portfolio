"use client"

import * as React from "react"
import { LuCheck, LuLoaderCircle, LuSparkles, LuWandSparkles } from "react-icons/lu"
import { useAi } from "@/components/resume/ai/context"

// Small AI helpers placed next to fields. Nothing is sent until you pick an action, and
// results are only applied when you choose one.

const REWRITE_MODES = [
    { mode: "improve", label: "Improve wording" },
    { mode: "quantify", label: "Add impact & numbers" },
    { mode: "shorten", label: "Make it shorter" },
    { mode: "formal", label: "More formal" },
    { mode: "grammar", label: "Fix grammar" },
] as const

type Status = { state: "idle" } | { state: "loading" } | { state: "error", message: string } | { state: "options", options: string[] }

function Popover ({ open, onClose, children, align = "right" }: { open: boolean, onClose: () => void, children: React.ReactNode, align?: "left" | "right" }) {
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!open) return
        const onDown = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) onClose() }
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
        document.addEventListener("mousedown", onDown)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("mousedown", onDown)
            document.removeEventListener("keydown", onKey)
        }
    }, [open, onClose])
    if (!open) return null
    return (
        <div ref={ref} role="dialog" className={`absolute top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#1a1a2b] p-2 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
            {children}
        </div>
    )
}

function Options ({ status, onPick, onRetry }: { status: Status, onPick: (text: string) => void, onRetry: () => void }) {
    if (status.state === "loading") {
        return <p className="flex items-center gap-2 p-3 text-sm text-muted"><LuLoaderCircle className="animate-spin" aria-hidden="true" /> Writing…</p>
    }
    if (status.state === "error") {
        return (
            <div className="p-3 text-sm">
                <p className="text-rose-300">{status.message}</p>
                <button type="button" onClick={onRetry} className="mt-2 font-semibold text-accent-1 hover:underline">Back</button>
            </div>
        )
    }
    if (status.state !== "options") return null
    return (
        <div className="flex flex-col gap-1.5">
            <p className="px-2 pt-1 text-[11px] font-semibold tracking-wider text-dim uppercase">Pick one</p>
            {status.options.map((option, index) => (
                <button key={index} type="button" onClick={() => onPick(option)} className="group flex gap-2 rounded-lg border border-white/6 bg-white/3 p-3 text-left text-sm leading-relaxed text-fg/90 hover:border-accent-1">
                    <LuCheck className="mt-1 shrink-0 text-accent-1 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                    <span>{option}</span>
                </button>
            ))}
            <button type="button" onClick={onRetry} className="px-2 py-1 text-left text-xs font-semibold text-muted hover:text-white">← Other options</button>
        </div>
    )
}

function ModeList ({ modes, onSelect, disabled }: { modes: { mode: string, label: string }[], onSelect: (mode: string) => void, disabled?: string }) {
    return (
        <div className="flex flex-col">
            {modes.map(({ mode, label }) => (
                <button key={mode} type="button" onClick={() => onSelect(mode)} disabled={Boolean(disabled)} title={disabled} className="rounded-lg px-3 py-2 text-left text-sm text-fg/90 hover:bg-white/6 disabled:opacity-40">
                    {label}
                </button>
            ))}
            {disabled && <p className="px-3 pb-1 text-xs text-dim">{disabled}</p>}
        </div>
    )
}

const triggerClass = "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-accent-1 hover:bg-accent-1/10 disabled:opacity-40"

function useLimitMessage () {
    const ai = useAi()
    if (!ai) return "AI isn't available here."
    if (ai.usage && ai.usage.used >= ai.usage.limit) return "Daily AI limit reached. It resets at midnight UTC."
    return undefined
}

// Summary / free text: write from the resume, or rewrite what's there.
export function AiTextButton ({ kind, value, onApply }: { kind: "summary", value: string, onApply: (text: string) => void }) {
    const ai = useAi()
    const [open, setOpen] = React.useState(false)
    const [status, setStatus] = React.useState<Status>({ state: "idle" })
    const limit = useLimitMessage()
    const close = React.useCallback(() => { setOpen(false); setStatus({ state: "idle" }) }, [])

    async function run (mode: string) {
        if (!ai) return
        setStatus({ state: "loading" })
        const result = mode === "write"
            ? await ai.request<{ options: string[] }>("summary", { resume: ai.resumeText(), targetRole: ai.targetRole, jobDescription: ai.jobDescription })
            : await ai.request<{ options: string[] }>("rewrite", { text: value, mode, context: { kind, targetRole: ai.targetRole } })
        setStatus(result.ok ? { state: "options", options: result.data.options } : { state: "error", message: result.error.message })
    }

    const modes = [{ mode: "write", label: "Write it from my resume" }, ...(value.trim() ? REWRITE_MODES : [])]
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(current => !current)} className={triggerClass} aria-expanded={open}>
                <LuSparkles aria-hidden="true" /> AI
            </button>
            <Popover open={open} onClose={close}>
                {status.state === "idle" ? <ModeList modes={modes} onSelect={run} disabled={limit} /> : <Options status={status} onPick={text => { onApply(text); close() }} onRetry={() => setStatus({ state: "idle" })} />}
            </Popover>
        </div>
    )
}

type BulletContext = { role: string, company: string, section: string }

export function AiBulletButton ({ value, context, onApply }: { value: string, context: BulletContext, onApply: (text: string) => void }) {
    const ai = useAi()
    const [open, setOpen] = React.useState(false)
    const [status, setStatus] = React.useState<Status>({ state: "idle" })
    const limit = useLimitMessage()
    const close = React.useCallback(() => { setOpen(false); setStatus({ state: "idle" }) }, [])

    async function run (mode: string) {
        if (!ai) return
        setStatus({ state: "loading" })
        const result = await ai.request<{ options: string[] }>("rewrite", { text: value, mode, context: { kind: "bullet", ...context, targetRole: ai.targetRole } })
        setStatus(result.ok ? { state: "options", options: result.data.options } : { state: "error", message: result.error.message })
    }

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(current => !current)} disabled={!value.trim()} aria-label="Improve this bullet with AI" title="Improve with AI" aria-expanded={open} className="inline-flex size-8 items-center justify-center rounded-md text-accent-1 hover:bg-accent-1/10 disabled:opacity-20">
                <LuWandSparkles aria-hidden="true" />
            </button>
            <Popover open={open} onClose={close}>
                {status.state === "idle" ? <ModeList modes={[...REWRITE_MODES]} onSelect={run} disabled={limit} /> : <Options status={status} onPick={text => { onApply(text); close() }} onRetry={() => setStatus({ state: "idle" })} />}
            </Popover>
        </div>
    )
}

// Generate 4–6 new bullets for an entry; tick the ones to add.
export function AiBulletsButton ({ context, existing, onApply }: { context: BulletContext, existing: string[], onApply: (bullets: string[]) => void }) {
    const ai = useAi()
    const [open, setOpen] = React.useState(false)
    const [notes, setNotes] = React.useState("")
    const [state, setState] = React.useState<{ loading: boolean, error?: string, bullets?: string[], picked: Set<number> }>({ loading: false, picked: new Set() })
    const limit = useLimitMessage()
    const close = React.useCallback(() => { setOpen(false); setState({ loading: false, picked: new Set() }) }, [])

    async function generate () {
        if (!ai) return
        setState({ loading: true, picked: new Set() })
        const result = await ai.request<{ bullets: string[] }>("bullets", { ...context, notes, existing, targetRole: ai.targetRole, jobDescription: ai.jobDescription })
        setState(result.ok
            ? { loading: false, bullets: result.data.bullets, picked: new Set(result.data.bullets.map((_, index) => index)) }
            : { loading: false, error: result.error.message, picked: new Set() })
    }

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(current => !current)} className={triggerClass} aria-expanded={open}>
                <LuSparkles aria-hidden="true" /> Generate bullets
            </button>
            <Popover open={open} onClose={close}>
                {!state.bullets ? (
                    <div className="flex flex-col gap-2 p-1">
                        <label className="text-xs text-muted" htmlFor="ai-bullet-notes">What did you do? (optional, helps accuracy)</label>
                        <textarea id="ai-bullet-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={3} maxLength={1000} className="rounded-lg border border-white/10 bg-white/4 p-2 text-sm focus:border-accent-1 focus:outline-none" placeholder="e.g. managed 3 staff, built the filing system, weekly reports" />
                        {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
                        <button type="button" onClick={generate} disabled={state.loading || Boolean(limit) || !context.role.trim()} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-linear-65/srgb from-accent-1 to-accent-2 px-3 text-sm font-bold text-white disabled:opacity-50">
                            {state.loading ? <LuLoaderCircle className="animate-spin" aria-hidden="true" /> : <LuSparkles aria-hidden="true" />}
                            {state.loading ? "Writing…" : "Generate"}
                        </button>
                        {!context.role.trim() && <p className="text-xs text-dim">Add a job title first.</p>}
                        {limit && <p className="text-xs text-dim">{limit}</p>}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {state.bullets.map((bullet, index) => (
                            <label key={index} className="flex cursor-pointer gap-2 rounded-lg border border-white/6 bg-white/3 p-2.5 text-sm leading-relaxed">
                                <input
                                    type="checkbox"
                                    className="mt-1 size-4 shrink-0 accent-accent-1"
                                    checked={state.picked.has(index)}
                                    onChange={() => setState(current => {
                                        const picked = new Set(current.picked)
                                        if (picked.has(index)) picked.delete(index)
                                        else picked.add(index)
                                        return { ...current, picked }
                                    })}
                                />
                                {bullet}
                            </label>
                        ))}
                        <div className="flex justify-between gap-2 pt-1">
                            <button type="button" onClick={() => setState({ loading: false, picked: new Set() })} className="px-2 text-xs font-semibold text-muted hover:text-white">← Back</button>
                            <button type="button" onClick={() => { onApply(state.bullets!.filter((_, index) => state.picked.has(index))); close() }} disabled={state.picked.size === 0} className="inline-flex min-h-9 items-center rounded-lg bg-linear-65/srgb from-accent-1 to-accent-2 px-3 text-sm font-bold text-white disabled:opacity-50">
                                Add {state.picked.size}
                            </button>
                        </div>
                    </div>
                )}
            </Popover>
        </div>
    )
}
