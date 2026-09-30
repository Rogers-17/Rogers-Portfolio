"use client"

import * as React from "react"
import { LuCheck } from "react-icons/lu"

type Props = {
    label: string
    options: string[]
    value: string
    onChange: (value: string) => void
    columns?: "two" | "three"
    invalid?: boolean
    describedBy?: string
}

// Radio group rendered as cards: one tab stop, arrow keys move and select (roving tabindex).
export default function OptionCards ({ label, options, value, onChange, columns = "two", invalid, describedBy }: Props) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([])
    const selectedIndex = options.indexOf(value)
    const focusIndex = selectedIndex === -1 ? 0 : selectedIndex

    function onKeyDown (event: React.KeyboardEvent, index: number) {
        const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
        if (event.key === "Home" || event.key === "End") {
            event.preventDefault()
            const target = event.key === "Home" ? 0 : options.length - 1
            onChange(options[target])
            refs.current[target]?.focus()
            return
        }
        if (!(event.key in keys)) return
        event.preventDefault()
        const target = (index + keys[event.key] + options.length) % options.length
        onChange(options[target])
        refs.current[target]?.focus()
    }

    return (
        <div
            role="radiogroup"
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 ${columns === "three" ? "md:grid-cols-3" : ""}`}
        >
            {options.map((option, index) => {
                const selected = option === value
                return (
                    <button
                        key={option}
                        ref={element => { refs.current[index] = element }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={index === focusIndex ? 0 : -1}
                        onClick={() => onChange(option)}
                        onKeyDown={event => onKeyDown(event, index)}
                        className={`relative flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-[border-color,background-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 active:scale-[0.98] ${selected ? "border-transparent text-white [background:linear-gradient(#1a0d2b,#1a0d2b)_padding-box,linear-gradient(65deg,#de0eff,#751cff)_border-box]" : "border-white/8 bg-white/3 text-fg/90 hover:border-white/20 hover:bg-white/5"}`}
                    >
                        <span>{option}</span>
                        <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors ${selected ? "bg-linear-65/srgb from-accent-1 to-accent-2 text-white" : "border border-white/15"}`} aria-hidden="true">
                            {selected && <LuCheck className="size-3" strokeWidth={3} />}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
