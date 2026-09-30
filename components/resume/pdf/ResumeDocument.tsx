import { Document } from "@react-pdf/renderer"
import Classic from "@/components/resume/pdf/templates/Classic"
import Professional from "@/components/resume/pdf/templates/Professional"
import Sidebar from "@/components/resume/pdf/templates/Sidebar"
import Timeline from "@/components/resume/pdf/templates/Timeline"
import { visibleSections } from "@/lib/resume/normalize"
import { TEMPLATE_INFO, type ResumeData, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

const TEMPLATE_COMPONENTS = { professional: Professional, classic: Classic, timeline: Timeline, sidebar: Sidebar }

type Props = {
    template: TemplateKey
    design: ResumeDesign
    data: ResumeData
    photoUrl: string | null
    title?: string
}

export default function ResumeDocument ({ template, design, data, photoUrl, title }: Props) {
    const Template = TEMPLATE_COMPONENTS[template]
    const accent = design.accent ?? TEMPLATE_INFO[template].accents[0]
    return (
        <Document title={title ?? `${data.contact.fullName || "Resume"} – Resume`} author={data.contact.fullName || undefined} creator="Rogers Portfolio" producer="Rogers Portfolio">
            <Template contact={data.contact} sections={visibleSections(data)} design={design} accent={accent} photoUrl={photoUrl} />
        </Document>
    )
}
