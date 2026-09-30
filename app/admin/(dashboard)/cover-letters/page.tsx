import CoverLetterList from "@/components/resume/CoverLetterList"
import { requireAdminPage } from "@/lib/admin/auth"
import { listCoverLetters, listResumes } from "@/lib/resume/queries"

export default async function AdminCoverLettersPage () {
    const { supabase } = await requireAdminPage()
    const [letters, resumes] = await Promise.all([listCoverLetters(supabase), listResumes(supabase)])
    const titles = new Map(resumes.map(resume => [resume.id, resume.title]))

    return (
        <CoverLetterList
            defaultResumeId={resumes[0]?.id ?? null}
            letters={letters.map(letter => ({
                id: letter.id,
                title: letter.title,
                company: letter.company,
                job_title: letter.job_title,
                resumeTitle: letter.resume_id ? titles.get(letter.resume_id) ?? null : null,
                updated_at: letter.updated_at,
            }))}
        />
    )
}
