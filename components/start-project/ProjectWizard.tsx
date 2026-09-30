"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import OptionCards from "@/components/start-project/OptionCards"
import SendOptions, { type SendResult } from "@/components/start-project/SendOptions"
import { DETAILS_MAX, stepSchemas, todayIso } from "@/lib/project-request/schema"
import { STEP_KEYS, type ProjectFormSettings, type StepKey } from "@/lib/pages/schema"

export type Answers = {
    name: string
    locationChoice: string
    locationOther: string
    project_type: string
    business_name: string
    is_flexible: boolean
    deadline_date: string
    deadline_time: string
    budget: string
    details: string
}

const EMPTY: Answers = {
    name: "",
    locationChoice: "",
    locationOther: "",
    project_type: "",
    business_name: "",
    is_flexible: false,
    deadline_date: "",
    deadline_time: "",
    budget: "",
    details: "",
}

const OTHER = "Other"
const DRAFT_KEY = "start-project-draft"
const TOTAL = STEP_KEYS.length

type Draft = { step: number, answers: Answers }

function readDraft (): Draft | null {
    try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<Draft>
        const step = Number(parsed.step)
        if (!parsed.answers || !Number.isInteger(step) || step < 0 || step >= TOTAL) return null
        return { step, answers: { ...EMPTY, ...parsed.answers } }
    } catch {
        return null
    }
}

function writeDraft (draft: Draft | null) {
    try {
        if (draft) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        else window.sessionStorage.removeItem(DRAFT_KEY)
    } catch {
        // Storage can be unavailable (private mode); the form still works without it.
    }
}

export const locationOf = (answers: Answers) => (answers.locationChoice === OTHER ? answers.locationOther : answers.locationChoice)

// Values checked by the step's Zod schema.
function stepValues (key: StepKey, answers: Answers) {
    switch (key) {
        case "name": return { name: answers.name }
        case "location": return { location: locationOf(answers) }
        case "type": return { project_type: answers.project_type }
        case "business": return { business_name: answers.business_name }
        case "deadline": return { is_flexible: answers.is_flexible, deadline_date: answers.deadline_date || null, deadline_time: answers.deadline_time || null }
        case "budget": return { budget: answers.budget }
        case "details": return { details: answers.details }
        default: return {}
    }
}

function validateStep (key: StepKey, answers: Answers): string | null {
    if (key === "send") return null
    const result = stepSchemas[key].safeParse(stepValues(key, answers))
    return result.success ? null : result.error.issues[0]?.message ?? "Check this answer"
}

const subscribe = () => () => {}

// Renders the wizard with an empty state on the server and during hydration, then remounts
// once on the client with any draft saved in sessionStorage (no hydration mismatch).
export default function ProjectWizard ({ settings }: { settings: ProjectFormSettings }) {
    const isClient = React.useSyncExternalStore(subscribe, () => true, () => false)
    return isClient
        ? <Wizard key="client" settings={settings} initial={readDraft()} />
        : <Wizard key="server" settings={settings} initial={null} />
}

function Wizard ({ settings, initial }: { settings: ProjectFormSettings, initial: Draft | null }) {
    const reduceMotion = useReducedMotion()
    const [step, setStep] = React.useState(initial?.step ?? 0)
    const [direction, setDirection] = React.useState(1)
    const [answers, setAnswers] = React.useState<Answers>(initial?.answers ?? EMPTY)
    const [error, setError] = React.useState<string | null>(null)
    const [honeypot, setHoneypot] = React.useState("")
    const [sent, setSent] = React.useState<SendResult | null>(null)
    const startedAt = React.useRef(0)
    const stepRef = React.useRef<HTMLDivElement>(null)
    const firstRender = React.useRef(true)

    const key = STEP_KEYS[step]
    const copy = settings.steps[key]
    const firstName = answers.name.trim().split(/\s+/)[0] ?? ""
    const fill = (text: string) => text.replace(/\{name\}/g, firstName).replace(/\s+,/g, ",").replace(/,\s*(?=[^\w\s]|$)/, " ").trim()
    const countries = settings.countries.length > 0 ? [...settings.countries, OTHER] : []
    const errorId = React.useId()

    React.useEffect(() => {
        startedAt.current = Date.now()
    }, [])

    React.useEffect(() => {
        writeDraft(sent ? null : { step, answers })
    }, [step, answers, sent])

    // Move focus to the new step's first control (not on first load, to avoid popping the phone keyboard).
    React.useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        const target = stepRef.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([tabindex='-1']), textarea, [role=radio][tabindex='0'], button[data-autofocus]")
        target?.focus({ preventScroll: true })
    }, [step, sent])

    const set = <K extends keyof Answers>(field: K, value: Answers[K]) => {
        setAnswers(current => ({ ...current, [field]: value }))
        setError(null)
    }

    function go (target: number) {
        setDirection(target > step ? 1 : -1)
        setError(null)
        setStep(target)
    }

    function next () {
        const message = validateStep(key, answers)
        if (message) {
            setError(message)
            return
        }
        if (step < TOTAL - 1) go(step + 1)
    }

    function reset () {
        writeDraft(null)
        setAnswers(EMPTY)
        setSent(null)
        setDirection(-1)
        setStep(0)
        startedAt.current = Date.now()
    }

    const canContinue = validateStep(key, answers) === null
    const offset = reduceMotion ? 0 : 40

    return (
        <div className="mx-auto w-full max-w-xl">
            <div className="h-0.75 w-full overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={sent ? TOTAL : step + 1}>
                <div className="h-full rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 transition-[width] duration-500 ease-out" style={{ width: `${((sent ? TOTAL : step + 1) / TOTAL) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">{sent ? "Request sent" : `Step ${step + 1} of ${TOTAL}`}</p>

            <div className="mt-12 md:mt-14">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={sent ? "sent" : step}
                        ref={stepRef}
                        custom={direction}
                        variants={{
                            enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
                            center: { opacity: 1, x: 0 },
                            exit: (dir: number) => ({ opacity: 0, x: dir * -offset }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.28, ease: "easeOut" }}
                    >
                        {sent ? (
                            <ThankYou name={firstName} result={sent} onReset={reset} />
                        ) : (
                            <form
                                noValidate
                                onSubmit={event => {
                                    event.preventDefault()
                                    next()
                                }}
                            >
                                <div className={key === "send" ? "text-center" : ""}>
                                    {copy.eyebrow && <p className="text-sm text-muted">{fill(copy.eyebrow)}</p>}
                                    <h1 className="mt-2 text-3xl leading-tight font-bold md:text-4xl">{fill(copy.title)}</h1>
                                    {copy.subtitle && <p className={`mt-3 text-sm leading-relaxed text-muted ${key === "send" ? "mx-auto max-w-sm" : ""}`}>{fill(copy.subtitle)}</p>}
                                </div>

                                {/* Honeypot: hidden from people, often filled by bots. */}
                                <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden="true">
                                    <label>
                                        Website
                                        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} />
                                    </label>
                                </div>

                                <div className="mt-8">
                                    <StepFields stepKey={key} answers={answers} set={set} countries={countries} settings={settings} error={error} errorId={errorId} onSubmitShortcut={next} />
                                </div>

                                {key === "send" ? (
                                    <SendOptions
                                        answers={answers}
                                        settings={settings}
                                        honeypot={honeypot}
                                        startedAt={() => startedAt.current}
                                        onSent={setSent}
                                        onBack={() => go(step - 1)}
                                    />
                                ) : (
                                    <>
                                        {error && <p id={errorId} role="alert" className="mt-4 text-sm text-rose-400">{error}</p>}
                                        <div className="mt-10 flex items-center justify-between gap-4">
                                            {step > 0 ? (
                                                <button type="button" onClick={() => go(step - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 px-6 text-sm font-semibold text-fg/90 transition-colors hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1">
                                                    <LuChevronLeft className="size-4" aria-hidden="true" />
                                                    Back
                                                </button>
                                            ) : <span />}
                                            <button
                                                type="submit"
                                                aria-disabled={!canContinue}
                                                className={`inline-flex min-h-12 items-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,14,255,0.3)] transition-[opacity,transform,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 ${canContinue ? "hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(222,14,255,0.45)]" : "opacity-50"}`}
                                            >
                                                Continue
                                                <LuChevronRight className="size-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

const underlineInput =
    "w-full border-0 border-b border-white/15 bg-transparent px-0 py-3 text-lg text-fg placeholder:text-dim transition-colors focus:border-accent-1 focus:outline-none aria-invalid:border-rose-500"

type FieldsProps = {
    stepKey: StepKey
    answers: Answers
    set: <K extends keyof Answers>(field: K, value: Answers[K]) => void
    countries: string[]
    settings: ProjectFormSettings
    error: string | null
    errorId: string
    onSubmitShortcut: () => void
}

function StepFields ({ stepKey, answers, set, countries, settings, error, errorId, onSubmitShortcut }: FieldsProps) {
    const invalid = Boolean(error)
    const describedBy = error ? errorId : undefined

    switch (stepKey) {
        case "name":
            return (
                <input
                    type="text"
                    aria-label="Your name"
                    placeholder="Type your name"
                    autoComplete="given-name"
                    maxLength={60}
                    value={answers.name}
                    onChange={event => set("name", event.target.value)}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    className={underlineInput}
                />
            )
        case "location":
            return (
                <div className="flex flex-col gap-5">
                    {countries.length > 0 && (
                        <OptionCards label="Where are you based?" options={countries} value={answers.locationChoice} onChange={value => set("locationChoice", value)} invalid={invalid && answers.locationChoice !== OTHER} describedBy={describedBy} />
                    )}
                    {(countries.length === 0 || answers.locationChoice === OTHER) && (
                        <input
                            type="text"
                            aria-label="Your country"
                            placeholder="Type your country"
                            autoComplete="country-name"
                            maxLength={60}
                            value={answers.locationOther}
                            onChange={event => {
                                set("locationOther", event.target.value)
                                if (countries.length === 0) set("locationChoice", OTHER)
                            }}
                            aria-invalid={invalid}
                            aria-describedby={describedBy}
                            className={underlineInput}
                        />
                    )}
                </div>
            )
        case "type":
            return <OptionCards label="Project type" options={settings.project_types} value={answers.project_type} onChange={value => set("project_type", value)} columns="three" invalid={invalid} describedBy={describedBy} />
        case "business":
            return (
                <input
                    type="text"
                    aria-label="Business or product name"
                    placeholder="e.g. Acme Studio"
                    autoComplete="organization"
                    maxLength={80}
                    value={answers.business_name}
                    onChange={event => set("business_name", event.target.value)}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    className={underlineInput}
                />
            )
        case "deadline":
            return (
                <div className="flex flex-col gap-6">
                    <div className={`grid gap-6 min-[480px]:grid-cols-[1fr_10rem] ${answers.is_flexible ? "pointer-events-none opacity-40" : ""}`}>
                        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
                            Date
                            <input
                                type="date"
                                min={todayIso(1)}
                                max={todayIso(365 * 5)}
                                value={answers.deadline_date}
                                disabled={answers.is_flexible}
                                onChange={event => set("deadline_date", event.target.value)}
                                aria-invalid={invalid && !answers.is_flexible}
                                aria-describedby={describedBy}
                                className={`${underlineInput} scheme-dark normal-case tracking-normal`}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
                            Time (optional)
                            <input
                                type="time"
                                value={answers.deadline_time}
                                disabled={answers.is_flexible}
                                onChange={event => set("deadline_time", event.target.value)}
                                className={`${underlineInput} scheme-dark normal-case tracking-normal`}
                            />
                        </label>
                    </div>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 self-start rounded-full border border-white/10 bg-white/3 px-5 text-sm font-semibold transition-colors hover:border-white/25 has-checked:border-accent-1 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-1">
                        <input type="checkbox" className="size-4 accent-accent-1" checked={answers.is_flexible} onChange={event => set("is_flexible", event.target.checked)} />
                        I&apos;m flexible
                    </label>
                </div>
            )
        case "budget":
            return <OptionCards label="Budget" options={settings.budgets} value={answers.budget} onChange={value => set("budget", value)} invalid={invalid} describedBy={describedBy} />
        case "details":
            return (
                <div>
                    <textarea
                        aria-label="Project details"
                        placeholder="What are you building, who is it for and what should it do?"
                        rows={6}
                        maxLength={DETAILS_MAX}
                        value={answers.details}
                        onChange={event => set("details", event.target.value)}
                        onKeyDown={event => {
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault()
                                onSubmitShortcut()
                            }
                        }}
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                        className="field-sizing-content min-h-40 w-full resize-y rounded-xl border border-white/12 bg-white/3 px-4 py-3 text-base leading-relaxed text-fg placeholder:text-dim transition-colors focus:border-accent-1 focus:outline-none aria-invalid:border-rose-500"
                    />
                    <p className="mt-2 flex justify-between text-xs text-dim">
                        <span className="hidden md:inline">Ctrl + Enter to continue</span>
                        <span className="ml-auto">{answers.details.length}/{DETAILS_MAX}</span>
                    </p>
                </div>
            )
        default:
            return null
    }
}

function ThankYou ({ name, result, onReset }: { name: string, result: SendResult, onReset: () => void }) {
    const message = {
        whatsapp: "Your message is ready in WhatsApp. Hit send there and I'll reply as soon as I can.",
        email: "Your email draft is ready. Send it from your email app and I'll reply as soon as I can.",
        callback: "Thanks! I've got your details and I'll call or text you shortly.",
    }[result.channel]

    return (
        <div className="text-center">
            <p className="text-sm text-muted">Thank you{name ? `, ${name}` : ""} 🎉</p>
            <h1 className="mt-2 text-3xl leading-tight font-bold md:text-4xl">Your request is on its way.</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">{message}</p>
            {result.warning && <p role="status" className="mx-auto mt-4 max-w-sm rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">{result.warning}</p>}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 min-[400px]:flex-row">
                <Link href="/" className="inline-flex min-h-12 items-center rounded-full border border-white/12 px-6 text-sm font-semibold hover:border-white/30">Back to home</Link>
                <button type="button" data-autofocus onClick={onReset} className="inline-flex min-h-12 items-center rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-7 text-sm font-bold text-white">Start another</button>
            </div>
        </div>
    )
}
