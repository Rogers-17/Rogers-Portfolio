import JobTracker from "@/components/jobs/JobTracker"
import { requireAdminPage } from "@/lib/admin/auth"
import { uuidSchema } from "@/lib/admin/schemas"
import { listJobs } from "@/lib/jobs/queries"
import { todayUtc } from "@/lib/jobs/schema"
import { listCoverLetters, listResumes } from "@/lib/resume/queries"

type Props = { searchParams: Promise<{ resume?: string }> }

export const metadata = { title: "Job tracker | Rogers admin" }

export default async function JobTrackerPage ({ searchParams }: Props) {
    const resume = uuidSchema.safeParse((await searchParams).resume)
    const { supabase } = await requireAdminPage()
    const [jobs, resumes, letters] = await Promise.all([listJobs(supabase), listResumes(supabase), listCoverLetters(supabase)])

    return (
        <JobTracker
            initialJobs={jobs}
            resumes={resumes.map(entry => ({ id: entry.id, title: entry.title }))}
            letters={letters.map(entry => ({ id: entry.id, title: entry.title }))}
            serverToday={todayUtc()}
            resumeFilter={resume.success ? resume.data : null}
        />
    )
}
