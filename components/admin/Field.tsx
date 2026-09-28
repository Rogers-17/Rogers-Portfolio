"use client"

import * as React from "react"

export const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-sm text-fg placeholder:text-dim transition-colors focus:border-accent-1 focus:outline-none aria-[invalid=true]:border-rose-500"

type BaseProps = {
    label: string
    error?: string
    hint?: string
    className?: string
}

function FieldShell ({ id, label, error, hint, className = "", children }: BaseProps & { id: string, children: React.ReactNode }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label htmlFor={id} className="text-sm font-medium text-fg/90">{label}</label>
            {children}
            {hint && !error && <p id={`${id}-hint`} className="text-xs text-dim">{hint}</p>}
            {error && <p id={`${id}-error`} className="text-xs text-rose-400">{error}</p>}
        </div>
    )
}

function describedBy (id: string, error?: string, hint?: string) {
    return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

export function TextField ({ label, error, hint, className, ...props }: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
    const generatedId = React.useId()
    const id = props.id ?? generatedId
    return (
        <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
            <input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} className={inputClass} />
        </FieldShell>
    )
}

export function TextAreaField ({ label, error, hint, className, rows = 5, ...props }: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const generatedId = React.useId()
    const id = props.id ?? generatedId
    return (
        <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
            <textarea
                {...props}
                id={id}
                rows={rows}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy(id, error, hint)}
                className={`${inputClass} field-sizing-content min-h-24 resize-y leading-relaxed`}
            />
        </FieldShell>
    )
}

export function SelectField ({ label, error, hint, className, children, ...props }: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
    const generatedId = React.useId()
    const id = props.id ?? generatedId
    return (
        <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
            <select {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} className={`${inputClass} [&>option]:bg-card`}>
                {children}
            </select>
        </FieldShell>
    )
}

export function Switch ({ checked, onChange, label, disabled }: { checked: boolean, onChange: (value: boolean) => void, label: string, disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-1 disabled:opacity-50 ${checked ? "bg-linear-65/srgb from-accent-1 to-accent-2" : "bg-white/15"}`}
        >
            <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </button>
    )
}

export function Card ({ title, hint, children, action }: { title: string, hint?: string, children: React.ReactNode, action?: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/6 bg-card p-5 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold">{title}</h2>
                    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
                </div>
                {action}
            </div>
            <div className="flex flex-col gap-5">{children}</div>
        </section>
    )
}

export const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-full bg-linear-65/srgb from-accent-1 to-accent-2 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] transition-all hover:shadow-[0_6px_30px_rgba(222,14,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"

export const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/4 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent-1 disabled:cursor-not-allowed disabled:opacity-50"

export const iconButtonClass =
    "inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-muted transition-colors hover:border-accent-1 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
