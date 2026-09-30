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
                <p className="text-[11px] font-semibold tracking-[0.2em] text-dim uppercase"><span className="text-accent-1">03</span> / Career</p>
                <h1 className="mt-1 text-2xl font-bold md:text-3xl">Resume settings</h1>
                <p className="mt-1 text-sm text-muted">AI model, daily limit and defaults for the Resume Builder.</p>
            </div>
            <ResumeSettingsForm settings={settings} usage={usage} month={month} />
        </>
    )
}
