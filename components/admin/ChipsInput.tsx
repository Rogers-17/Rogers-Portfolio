"use client"

import * as React from "react"
import { FiX } from "react-icons/fi"
import { inputClass } from "@/components/admin/Field"

type Props = {
    label: string
    values: string[]
    onChange: (values: string[]) => void
    max: number
    error?: string
    hint?: string
    placeholder?: string
}

// Type a value and press Enter or comma to add it; Backspace on an empty input removes the last chip.
export default function ChipsInput ({ label, values, onChange, max, error, hint, placeholder = "Type and press Enter" }: Props) {
    const id = React.useId()
    const [draft, setDraft] = React.useState("")

    function add (raw: string) {
        const value = raw.trim().replace(/,$/, "").trim()
        if (!value || values.length >= max) return
        if (values.some(existing => existing.toLowerCase() === value.toLowerCase())) return
        onChange([...values, value.slice(0, 40)])
        setDraft("")
    }

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-fg/90">{label}</label>
            <div className={`${inputClass} flex flex-wrap items-center gap-2 py-2 focus-within:border-accent-1 ${error ? "border-rose-500" : ""}`}>
                {values.map(value => (
                    <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-1/40 bg-accent-1/10 py-0.5 pr-1 pl-3 text-sm">
                        <span className="truncate">{value}</span>
                        <button type="button" onClick={() => onChange(values.filter(item => item !== value))} aria-label={`Remove ${value}`} className="rounded-full p-1.5 text-muted hover:text-rose-400">
                            <FiX aria-hidden="true" />
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    value={draft}
                    onChange={event => {
                        const next = event.target.value
                        if (next.endsWith(",")) add(next)
                        else setDraft(next)
                    }}
                    onKeyDown={event => {
                        if (event.key === "Enter") {
                            event.preventDefault()
                            add(draft)
                        } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
                            onChange(values.slice(0, -1))
                        }
                    }}
                    onBlur={() => add(draft)}
                    disabled={values.length >= max}
                    placeholder={values.length >= max ? `Max ${max}` : placeholder}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                    className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-dim"
                />
            </div>
            {hint && !error && <p id={`${id}-hint`} className="text-xs text-dim">{hint}</p>}
            {error && <p id={`${id}-error`} className="text-xs text-rose-400">{error}</p>}
        </div>
    )
}
