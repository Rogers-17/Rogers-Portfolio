"use client"

import * as React from "react"
import { LuArrowDown, LuArrowUp, LuPlus, LuX } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import { labelClass } from "@/components/resume/controls"

type Props = {
    label: string
    bullets: string[]
    onChange: (bullets: string[]) => void
    max: number
    // Optional AI helpers: one per bullet, and one for the whole list.
    renderBulletAi?: (index: number, value: string, apply: (text: string) => void) => React.ReactNode
    listAi?: React.ReactNode
}

const MAX_BULLETS = 25

// Enter adds a bullet below; Backspace in an empty bullet removes it.
export default function BulletsEditor ({ label, bullets, onChange, max, renderBulletAi, listAi }: Props) {
    const refs = React.useRef<(HTMLTextAreaElement | null)[]>([])
    const focusNext = React.useRef<number | null>(null)

    React.useEffect(() => {
        if (focusNext.current === null) return
        refs.current[focusNext.current]?.focus()
        focusNext.current = null
    })

    const update = (index: number, value: string) => onChange(bullets.map((bullet, i) => (i === index ? value : bullet)))
    const insert = (index: number) => {
        if (bullets.length >= MAX_BULLETS) return
        focusNext.current = index
        onChange([...bullets.slice(0, index), "", ...bullets.slice(index)])
    }
    const remove = (index: number) => {
        focusNext.current = Math.max(0, index - 1)
        onChange(bullets.filter((_, i) => i !== index))
    }
    const move = (index: number, delta: number) => {
        const target = index + delta
        if (target < 0 || target >= bullets.length) return
        const next = [...bullets]
        ;[next[index], next[target]] = [next[target], next[index]]
        onChange(next)
    }

    return (
        <div className="flex flex-col gap-2 @xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={labelClass}>{label}</span>
                {listAi}
            </div>
            <ul className="flex flex-col gap-2">
                {bullets.map((bullet, index) => (
                    <li key={index} className="group flex items-start gap-2">
                        <span className="mt-3 size-1.5 shrink-0 rounded-full bg-accent-1" aria-hidden="true" />
                        <textarea
                            ref={element => { refs.current[index] = element }}
                            value={bullet}
                            rows={1}
                            maxLength={max}
                            aria-label={`${label} ${index + 1}`}
                            onChange={event => update(index, event.target.value)}
                            onKeyDown={event => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    insert(index + 1)
                                }
                                if (event.key === "Backspace" && !bullet && bullets.length > 0) {
                                    event.preventDefault()
                                    remove(index)
                                }
                            }}
                            className={`${inputClass} field-sizing-content min-h-10 flex-1 resize-none py-2 leading-relaxed`}
                        />
                        <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-100 transition-opacity lg:opacity-40 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                            {renderBulletAi?.(index, bullet, text => update(index, text))}
                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move bullet ${index + 1} up`} className="inline-flex size-8 items-center justify-center rounded-md text-dim hover:bg-white/6 hover:text-white disabled:opacity-20">
                                <LuArrowUp aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => move(index, 1)} disabled={index === bullets.length - 1} aria-label={`Move bullet ${index + 1} down`} className="inline-flex size-8 items-center justify-center rounded-md text-dim hover:bg-white/6 hover:text-white disabled:opacity-20">
                                <LuArrowDown aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => remove(index)} aria-label={`Remove bullet ${index + 1}`} className="inline-flex size-8 items-center justify-center rounded-md text-dim hover:bg-rose-500/10 hover:text-rose-300">
                                <LuX aria-hidden="true" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={() => insert(bullets.length)} disabled={bullets.length >= MAX_BULLETS} className="inline-flex min-h-9 items-center gap-2 self-start rounded-lg px-2 text-sm font-semibold text-accent-1 hover:bg-accent-1/10 disabled:opacity-40">
                <LuPlus aria-hidden="true" />
                Add bullet
            </button>
        </div>
    )
}
