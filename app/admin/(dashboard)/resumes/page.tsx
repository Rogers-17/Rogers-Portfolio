import ResumeList from "@/components/resume/ResumeList"
import { requireAdminPage } from "@/lib/admin/auth"
import { getResumeSettings, listResumes } from "@/lib/resume/queries"
import { TEMPLATE_INFO } from "@/lib/resume/schema"

type Props = { searchParams: Promise<{ archived?: string }> }

export default async function AdminResumesPage ({ searchParams }: Props) {
    const archived = (await searchParams).archived === "1"
    const { supabase } = await requireAdminPage()
    const [resumes, settings] = await Promise.all([listResumes(supabase, archived), getResumeSettings(supabase)])

    return (
        <ResumeList
            archived={archived}
            defaultTemplate={settings.default_template}
            resumes={resumes.map(resume => ({
                id: resume.id,
                title: resume.title,
                target_role: resume.target_role,
                template: resume.template,
                updated_at: resume.updated_at,
                is_archived: resume.is_archived,
                job_company: resume.job_company,
                accent: resume.design.accent ?? TEMPLATE_INFO[resume.template].accents[0],
            }))}
        />
    )
}
