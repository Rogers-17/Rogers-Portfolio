import Link from "next/link"
import ResumeSettingsForm from "@/components/resume/ResumeSettingsForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { usageSummary } from "@/lib/ai/openrouter"
import { aiUsageStats, getResumeSettings } from "@/lib/resume/queries"

export default async function ResumeSettingsPage () {
    const { supabase } = await requireAdminPage()
    const [settings, usage, month] = await Promise.all([getResumeSettings(supabase), usageSummary(supabase), aiUsageStats(supabase)])

    return (
        <>
            <div className="mb-6 md:mb-8">
                <Link href="/admin/resumes" className="text-sm text-muted hover:text-white">← Resumes</Link>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">Resume settings</h1>
                <p className="mt-1 text-sm text-muted">AI model, daily limit and defaults for the Resume Builder.</p>
            </div>
            <ResumeSettingsForm settings={settings} usage={usage} month={month} />
        </>
    )
}
