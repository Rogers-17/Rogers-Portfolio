import { notFound } from "next/navigation"
import CoverLetterEditor from "@/components/resume/CoverLetterEditor"
import { requireAdminPage } from "@/lib/admin/auth"
import { uuidSchema } from "@/lib/admin/schemas"
import { getCoverLetter, listResumes } from "@/lib/resume/queries"

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: "Cover letter | Rogers admin", robots: { index: false, follow: false } }

export default async function CoverLetterPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const [letter, resumes] = await Promise.all([getCoverLetter(supabase, id.data), listResumes(supabase)])
    if (!letter) notFound()

    return (
        <CoverLetterEditor
            key={letter.id}
            letter={letter}
            resumes={resumes.map(resume => ({
                id: resume.id,
                title: resume.title,
                template: resume.template,
                design: resume.design,
                data: resume.data,
                job_description: resume.job_description,
                job_company: resume.job_company,
                target_role: resume.target_role,
            }))}
        />
    )
}
