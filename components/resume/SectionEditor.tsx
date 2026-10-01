"use client"

import * as React from "react"
import { LuChevronDown, LuCopy, LuEye, LuEyeOff, LuPlus, LuTrash2 } from "react-icons/lu"
import { useDialog } from "@/components/admin/Dialog"
import { inputClass } from "@/components/admin/Field"
import BulletsEditor from "@/components/resume/BulletsEditor"
import { PanelHeading, RCheckbox, RField, RTextArea, ghostButton, labelClass } from "@/components/resume/controls"
import { COMPACT_TYPES, SECTION_FIELDS, itemLabel, type FieldDef } from "@/components/resume/fields"
import { SortableList, SortableRow } from "@/components/resume/Sortable"
import { AiBulletButton, AiBulletsButton, AiTextButton } from "@/components/resume/ai/AiButtons"
import { SECTION_LABELS, emptyItem, newId, type ResumeSection, type SectionItem } from "@/lib/resume/schema"

type Props = {
    section: ResumeSection
    onChange: (section: ResumeSection) => void
    onRemove: () => void
}

type AnyItem = SectionItem & Record<string, unknown>

export default function SectionEditor ({ section, onChange, onRemove }: Props) {
    const items = section.items as AnyItem[]
    const { confirm } = useDialog()
    const [openId, setOpenId] = React.useState<string | null>(items[0]?.id ?? null)
    const setItems = (next: AnyItem[]) => onChange({ ...section, items: next } as ResumeSection)
    const updateItem = (id: string, patch: Record<string, unknown>) => setItems(items.map(item => (item.id === id ? { ...item, ...patch } : item)))

    function addItem () {
        const item = emptyItem(section.type) as AnyItem
        setItems([...items, item])
        setOpenId(item.id)
    }

    const isSummary = section.type === "summary"
    const compact = COMPACT_TYPES.includes(section.type)

    return (
        <div>
            <PanelHeading
                title={section.title || SECTION_LABELS[section.type]}
                subtitle={`${SECTION_LABELS[section.type]} section`}
                action={(
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onChange({ ...section, visible: !section.visible })} className={ghostButton} aria-pressed={!section.visible}>
                            {section.visible ? <LuEye aria-hidden="true" /> : <LuEyeOff aria-hidden="true" />}
                            {section.visible ? "Shown" : "Hidden"}
                        </button>
                        <button
                            type="button"
                            onClick={async () => { if (await confirm({ title: `Remove “${section.title || "this section"}”?`, message: "The section and everything in it are removed from this resume. Earlier versions stay in History.", confirmLabel: "Remove section", tone: "danger" })) onRemove() }}
                            aria-label="Remove section"
                            className={`${ghostButton} hover:border-rose-500 hover:text-rose-300`}
                        >
                            <LuTrash2 aria-hidden="true" />
                        </button>
                    </div>
                )}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <RField label="Section title" value={section.title} onChange={title => onChange({ ...section, title })} maxLength={80} placeholder={SECTION_LABELS[section.type]} />
                <RField label="Note under the title (optional)" value={section.note} onChange={note => onChange({ ...section, note })} maxLength={300} placeholder={section.type === "references" ? "Available on request" : ""} />
            </div>

            {isSummary ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {(items.length ? items : [emptyItem("summary") as AnyItem]).slice(0, 1).map(item => (
                        <RTextArea
                            key={item.id}
                            label="Summary"
                            rows={6}
                            value={String(item.text ?? "")}
                            maxLength={3000}
                            placeholder={SECTION_FIELDS.summary[0].placeholder}
                            onChange={text => setItems(items.length ? items.map(entry => (entry.id === item.id ? { ...entry, text } : entry)) : [{ ...item, text }])}
                            action={<AiTextButton kind="summary" value={String(item.text ?? "")} onApply={text => setItems(items.length ? items.map(entry => (entry.id === item.id ? { ...entry, text } : entry)) : [{ ...item, text }])} />}
                        />
                    ))}
                </div>
            ) : compact ? (
                <CompactList section={section} items={items} setItems={setItems} />
            ) : (
                <div className="mt-6 flex flex-col gap-3">
                    <SortableList items={items} onReorder={setItems}>
                        {items.map(item => {
                            const open = openId === item.id
                            return (
                                <SortableRow key={item.id} id={item.id} label={itemLabel(section.type, item)} className="rounded-xl border border-white/8 bg-white/2">
                                    {({ handle }) => (
                                        <>
                                            <div className="flex items-center gap-1 px-2 py-1.5">
                                                {handle}
                                                <button type="button" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open} className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 text-left text-sm font-semibold hover:bg-white/3">
                                                    <span className="truncate">{itemLabel(section.type, item)}</span>
                                                    <LuChevronDown className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                                                </button>
                                                <button type="button" onClick={() => setItems([...items.slice(0, items.indexOf(item) + 1), { ...item, id: newId() }, ...items.slice(items.indexOf(item) + 1)])} aria-label="Duplicate entry" title="Duplicate" className="inline-flex size-9 items-center justify-center rounded-md text-dim hover:bg-white/6 hover:text-white">
                                                    <LuCopy aria-hidden="true" />
                                                </button>
                                                <button type="button" onClick={async () => { if (await confirm({ title: "Delete this entry?", message: `“${itemLabel(section.type, item)}” is removed from this section.`, confirmLabel: "Delete", tone: "danger" })) setItems(items.filter(entry => entry.id !== item.id)) }} aria-label="Delete entry" title="Delete" className="inline-flex size-9 items-center justify-center rounded-md text-dim hover:bg-rose-500/10 hover:text-rose-300">
                                                    <LuTrash2 aria-hidden="true" />
                                                </button>
                                            </div>
                                            {open && (
                                                <div className="grid gap-4 border-t border-white/6 p-4 md:grid-cols-2">
                                                    {SECTION_FIELDS[section.type].map(field => (
                                                        <ItemField key={field.key} field={field} item={item} onChange={patch => updateItem(item.id, patch)} sectionType={section.type} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </SortableRow>
                            )
                        })}
                    </SortableList>
                    <button type="button" onClick={addItem} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-sm font-semibold text-muted transition-colors hover:border-accent-1 hover:text-white">
                        <LuPlus aria-hidden="true" />
                        Add {SECTION_LABELS[section.type].toLowerCase()} entry
                    </button>
                </div>
            )}
        </div>
    )
}

function ItemField ({ field, item, onChange, sectionType }: { field: FieldDef, item: AnyItem, onChange: (patch: Record<string, unknown>) => void, sectionType: ResumeSection["type"] }) {
    const value = item[field.key]
    if (field.kind === "checkbox") return <RCheckbox label={field.label} checked={Boolean(value)} onChange={checked => onChange({ [field.key]: checked })} />
    if (field.kind === "textarea") return <RTextArea label={field.label} value={String(value ?? "")} onChange={text => onChange({ [field.key]: text })} maxLength={field.max} placeholder={field.placeholder} rows={3} />
    if (field.kind === "bullets") {
        const bullets = Array.isArray(value) ? (value as string[]) : []
        const context = { role: String(item.role ?? item.name ?? item.heading ?? ""), company: String(item.company ?? item.organization ?? ""), section: sectionType }
        return (
            <BulletsEditor
                label={field.label}
                bullets={bullets}
                max={field.max}
                onChange={next => onChange({ [field.key]: next })}
                renderBulletAi={(index, text, apply) => <AiBulletButton value={text} context={context} onApply={apply} />}
                listAi={<AiBulletsButton context={context} existing={bullets} onApply={generated => onChange({ [field.key]: [...bullets.filter(bullet => bullet.trim()), ...generated].slice(0, 25) })} />}
            />
        )
    }
    const disabled = field.key === "end" && Boolean(item.current)
    return (
        <div className={field.wide ? "md:col-span-2" : ""}>
            {disabled ? (
                <div className="flex flex-col gap-1.5">
                    <span className={labelClass}>{field.label}</span>
                    <p className={`${inputClass} text-muted`}>Present</p>
                </div>
            ) : (
                <RField label={field.label} value={String(value ?? "")} onChange={text => onChange({ [field.key]: text })} maxLength={field.max} placeholder={field.placeholder} />
            )}
        </div>
    )
}

// Skills / languages / coursework: one compact row per entry.
function CompactList ({ section, items, setItems }: { section: ResumeSection, items: AnyItem[], setItems: (items: AnyItem[]) => void }) {
    const fields = SECTION_FIELDS[section.type]
    const [bulk, setBulk] = React.useState("")

    function addBulk () {
        const names = bulk.split(/\n|,/).map(value => value.trim()).filter(Boolean)
        if (!names.length) return
        setItems([...items, ...names.map(name => ({ ...(emptyItem(section.type) as AnyItem), [fields[0].key]: name.slice(0, fields[0].max) }))].slice(0, 60))
        setBulk("")
    }

    return (
        <div className="mt-6 flex flex-col gap-3">
            <SortableList items={items} onReorder={setItems}>
                {items.map(item => (
                    <SortableRow key={item.id} id={item.id} label={String(item[fields[0].key] || "entry")} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/2 p-1.5">
                        {({ handle }) => (
                            <>
                                {handle}
                                <div className={`grid min-w-0 flex-1 gap-2 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
                                    {fields.map(field => (
                                        <input
                                            key={field.key}
                                            aria-label={field.label}
                                            placeholder={field.placeholder ?? field.label}
                                            value={String(item[field.key] ?? "")}
                                            maxLength={field.max}
                                            onChange={event => setItems(items.map(entry => (entry.id === item.id ? { ...entry, [field.key]: event.target.value } : entry)))}
                                            className={`${inputClass} py-2`}
                                        />
                                    ))}
                                </div>
                                <button type="button" onClick={() => setItems(items.filter(entry => entry.id !== item.id))} aria-label="Remove" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-dim hover:bg-rose-500/10 hover:text-rose-300">
                                    <LuTrash2 aria-hidden="true" />
                                </button>
                            </>
                        )}
                    </SortableRow>
                ))}
            </SortableList>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    aria-label={`Add ${SECTION_LABELS[section.type].toLowerCase()}`}
                    value={bulk}
                    onChange={event => setBulk(event.target.value)}
                    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addBulk() } }}
                    placeholder={`Add ${fields[0].label.toLowerCase()}s: type, or paste several separated by commas`}
                    className={inputClass}
                />
                <button type="button" onClick={addBulk} className={`${ghostButton} justify-center`}>
                    <LuPlus aria-hidden="true" />
                    Add
                </button>
            </div>
        </div>
    )
}
