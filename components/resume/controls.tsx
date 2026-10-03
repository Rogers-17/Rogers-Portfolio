"use client"

import * as React from "react"
import { inputClass } from "@/components/admin/Field"

// Compact, uppercase-label form controls used across the resume editor (16.png style).

export const labelClass = "text-[11px] font-semibold tracking-wider text-muted uppercase"

export function RField ({ label, value, onChange, placeholder, maxLength, wide, type = "text", hint, action }: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    maxLength?: number
    wide?: boolean
    type?: string
    hint?: string
    action?: React.ReactNode
}) {
    const id = React.useId()
    return (
        <div className={`flex min-w-0 flex-col gap-1.5 ${wide ? "@xl:col-span-2" : ""}`}>
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className={labelClass}>{label}</label>
                {action}
            </div>
            <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} className={inputClass} />
            {hint && <p className="text-xs text-dim">{hint}</p>}
        </div>
    )
}

export function RTextArea ({ label, value, onChange, placeholder, maxLength, rows = 4, action }: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    maxLength?: number
    rows?: number
    action?: React.ReactNode
}) {
    const id = React.useId()
    return (
        <div className="flex min-w-0 flex-col gap-1.5 @xl:col-span-2">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className={labelClass}>{label}</label>
                {action}
            </div>
            <textarea id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} rows={rows} className={`${inputClass} field-sizing-content min-h-24 resize-y leading-relaxed`} />
            {maxLength ? <p className="text-right text-[11px] text-dim">{value.length}/{maxLength}</p> : null}
        </div>
    )
}

export function RCheckbox ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (value: boolean) => void }) {
    return (
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 self-end text-sm text-fg/90 @xl:col-span-2">
            <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="size-4 accent-accent-1" />
            {label}
        </label>
    )
}

export function PanelHeading ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/6 pb-4">
            <div className="min-w-0">
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
            {action}
        </div>
    )
}

export const ghostButton =
    "inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 text-sm font-semibold text-fg/90 transition-colors hover:border-accent-1 hover:text-white disabled:opacity-40"
