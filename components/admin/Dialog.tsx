"use client"

import * as React from "react"
import { LuCircleAlert, LuCircleHelp, LuPencil, LuTriangleAlert } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"

// Dashboard-wide confirmation and text-input dialogs, replacing window.confirm/prompt.
//   const { confirm, prompt } = useDialog()
//   if (!(await confirm({ title: "Delete post?", message: "…", confirmLabel: "Delete", tone: "danger" }))) return
//   const name = await prompt({ title: "Rename", label: "Name", defaultValue: "…" })
// Built on <dialog>: focus is trapped, Escape cancels, focus returns to the trigger.

type Tone = "danger" | "warning" | "default"

export type ConfirmOptions = {
    title: string
    message?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    tone?: Tone
}

export type PromptOptions = {
    title: string
    message?: React.ReactNode
    label: string
    defaultValue?: string
    placeholder?: string
    confirmLabel?: string
    cancelLabel?: string
    maxLength?: number
    required?: boolean
    // Return an error message to keep the dialog open.
    validate?: (value: string) => string | null
}

type Request =
    | { kind: "confirm", options: ConfirmOptions, resolve: (value: boolean) => void }
    | { kind: "prompt", options: PromptOptions, resolve: (value: string | null) => void }

type DialogApi = {
    confirm: (options: ConfirmOptions) => Promise<boolean>
    prompt: (options: PromptOptions) => Promise<string | null>
}

const DialogContext = React.createContext<DialogApi | null>(null)

const TONES: Record<Tone, { icon: typeof LuCircleAlert, iconClass: string, button: string }> = {
    danger: { icon: LuCircleAlert, iconClass: "bg-rose-500/12 text-rose-300", button: "bg-rose-600 hover:bg-rose-500 text-white" },
    warning: { icon: LuTriangleAlert, iconClass: "bg-amber-400/12 text-amber-200", button: "bg-amber-500 hover:bg-amber-400 text-black" },
    default: { icon: LuCircleHelp, iconClass: "bg-accent-1/12 text-accent-1", button: "bg-linear-65/srgb from-accent-1 to-accent-2 text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)]" },
}

export function DialogProvider ({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = React.useState<Request[]>([])
    const current = queue[0] ?? null

    const api = React.useMemo<DialogApi>(() => ({
        confirm: options => new Promise(resolve => setQueue(list => [...list, { kind: "confirm", options, resolve }])),
        prompt: options => new Promise(resolve => setQueue(list => [...list, { kind: "prompt", options, resolve }])),
    }), [])

    const settle = (value: boolean | string | null) => {
        if (!current) return
        if (current.kind === "confirm") current.resolve(value === true)
        else current.resolve(typeof value === "string" ? value : null)
        setQueue(list => list.slice(1))
    }

    return (
        <DialogContext.Provider value={api}>
            {children}
            {current && <DialogView key={queue.length + current.options.title} request={current} onSettle={settle} />}
        </DialogContext.Provider>
    )
}

function DialogView ({ request, onSettle }: { request: Request, onSettle: (value: boolean | string | null) => void }) {
    const ref = React.useRef<HTMLDialogElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const confirmRef = React.useRef<HTMLButtonElement>(null)
    const options = request.options
    const isPrompt = request.kind === "prompt"
    const tone: Tone = request.kind === "confirm" ? request.options.tone ?? "default" : "default"
    const { icon: Icon, iconClass, button } = TONES[tone]
    const [value, setValue] = React.useState(isPrompt ? (request.options as PromptOptions).defaultValue ?? "" : "")
    const [error, setError] = React.useState<string | null>(null)
    const titleId = React.useId()
    const messageId = React.useId()

    React.useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        const opener = document.activeElement as HTMLElement | null
        dialog.showModal()
        if (isPrompt) {
            inputRef.current?.focus()
            inputRef.current?.select()
        } else {
            // Destructive actions start on Cancel, so Enter can't delete by accident.
            if (tone === "danger") dialog.querySelector<HTMLButtonElement>("[data-cancel]")?.focus()
            else confirmRef.current?.focus()
        }
        return () => opener?.focus?.()
    }, [isPrompt, tone])

    function submit () {
        if (!isPrompt) return onSettle(true)
        const prompt = request.options as PromptOptions
        const trimmed = value.trim()
        if (prompt.required !== false && !trimmed) return setError("This can't be empty.")
        const message = prompt.validate?.(trimmed) ?? null
        if (message) return setError(message)
        onSettle(trimmed)
    }

    const defaultLabel = isPrompt ? "Save" : "Confirm"

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={options.message ? messageId : undefined}
            onCancel={event => { event.preventDefault(); onSettle(isPrompt ? null : false) }}
            // Keep Escape from also closing a drawer or menu behind the dialog.
            onKeyDown={event => { if (event.key === "Escape") event.stopPropagation() }}
            onClick={event => { if (event.target === ref.current) onSettle(isPrompt ? null : false) }}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] animate-fade-in rounded-2xl border border-white/10 bg-card p-0 text-fg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop:bg-black/65 backdrop:backdrop-blur-sm"
        >
            <form method="dialog" onSubmit={event => { event.preventDefault(); submit() }} className="p-5 md:p-6">
                <div className="flex gap-4">
                    <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${isPrompt ? "bg-accent-1/12 text-accent-1" : iconClass}`} aria-hidden="true">
                        {isPrompt ? <LuPencil /> : <Icon className="text-lg" />}
                    </span>
                    <div className="min-w-0 flex-1 pt-1.5">
                        <h2 id={titleId} className="text-base font-bold leading-snug">{options.title}</h2>
                        {options.message && <div id={messageId} className="mt-1.5 text-sm leading-relaxed text-muted">{options.message}</div>}
                    </div>
                </div>

                {isPrompt && (
                    <div className="mt-5 flex flex-col gap-1.5">
                        <label htmlFor={`${titleId}-input`} className="text-[11px] font-semibold tracking-wider text-muted uppercase">{(options as PromptOptions).label}</label>
                        <input
                            id={`${titleId}-input`}
                            ref={inputRef}
                            value={value}
                            maxLength={(options as PromptOptions).maxLength}
                            placeholder={(options as PromptOptions).placeholder}
                            onChange={event => { setValue(event.target.value); setError(null) }}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${titleId}-error` : undefined}
                            className={inputClass}
                        />
                        {error && <p id={`${titleId}-error`} className="text-xs text-rose-300">{error}</p>}
                    </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" data-cancel onClick={() => onSettle(isPrompt ? null : false)} className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-fg/90 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1">
                        {options.cancelLabel ?? "Cancel"}
                    </button>
                    <button ref={confirmRef} type="submit" className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${button}`}>
                        {options.confirmLabel ?? defaultLabel}
                    </button>
                </div>
            </form>
        </dialog>
    )
}

export function useDialog (): DialogApi {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("useDialog must be used inside <DialogProvider>")
    return context
}
