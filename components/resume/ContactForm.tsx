"use client"

import { LuPlus, LuTrash2 } from "react-icons/lu"
import { inputClass } from "@/components/admin/Field"
import ImageUpload from "@/components/admin/ImageUpload"
import { PanelHeading, RField, ghostButton, labelClass } from "@/components/resume/controls"
import { newId, type ResumeContact } from "@/lib/resume/schema"

type Props = {
    contact: ResumeContact
    photoUrl: string | null
    onChange: (contact: ResumeContact) => void
    onPhoto: (path: string | null, url: string | null) => void
}

export default function ContactForm ({ contact, photoUrl, onChange, onPhoto }: Props) {
    const set = <K extends keyof ResumeContact>(key: K, value: ResumeContact[K]) => onChange({ ...contact, [key]: value })

    return (
        <div>
            <PanelHeading title="Personal information" subtitle="Your contact details and professional links" />
            <div className="grid gap-4 @xl:grid-cols-2">
                <RField label="Full name *" value={contact.fullName} onChange={value => set("fullName", value)} maxLength={120} />
                <RField label="Headline" value={contact.headline} onChange={value => set("headline", value)} maxLength={160} placeholder="e.g. Aspiring IT & Database Professional" />
                <RField label="Email" type="email" value={contact.email} onChange={value => set("email", value)} maxLength={200} />
                <RField label="Phone number" type="tel" value={contact.phone} onChange={value => set("phone", value)} maxLength={80} />
                <RField label="Location / address" value={contact.location} onChange={value => set("location", value)} maxLength={200} placeholder="Monrovia, Liberia" />
                <RField label="LinkedIn" value={contact.linkedin} onChange={value => set("linkedin", value)} maxLength={300} placeholder="https://linkedin.com/in/…" />
                <RField label="Website / portfolio" value={contact.website} onChange={value => set("website", value)} maxLength={300} wide />
            </div>

            <div className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className={labelClass}>Extra details</p>
                        <p className="mt-0.5 text-xs text-dim">Labelled lines such as Date of Birth or Nationality. Only add what the job asks for.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => set("details", [...contact.details, { id: newId(), label: "", value: "" }])}
                        disabled={contact.details.length >= 8}
                        className={ghostButton}
                    >
                        <LuPlus aria-hidden="true" /> Add
                    </button>
                </div>
                <ul className="flex flex-col gap-2">
                    {contact.details.map(detail => (
                        <li key={detail.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
                            <input aria-label="Label" placeholder="Label" value={detail.label} maxLength={40} onChange={event => set("details", contact.details.map(entry => (entry.id === detail.id ? { ...entry, label: event.target.value } : entry)))} className={inputClass} />
                            <input aria-label="Value" placeholder="Value" value={detail.value} maxLength={200} onChange={event => set("details", contact.details.map(entry => (entry.id === detail.id ? { ...entry, value: event.target.value } : entry)))} className={inputClass} />
                            <button type="button" onClick={() => set("details", contact.details.filter(entry => entry.id !== detail.id))} aria-label="Remove detail" className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-rose-500/10 hover:text-rose-300">
                                <LuTrash2 aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-8 max-w-48">
                <p className={`${labelClass} mb-2`}>Photo (optional)</p>
                <ImageUpload
                    bucket="resume-assets"
                    folder="resumes"
                    resize={900}
                    path={contact.photoPath}
                    url={photoUrl}
                    onChange={value => onPhoto(value?.path ?? null, value?.url ?? null)}
                    label="Upload photo"
                    aspectClass="aspect-square"
                />
                <p className="mt-2 text-xs text-dim">Stored privately. Shown on templates that support a photo; turn it off in Design.</p>
            </div>
        </div>
    )
}
