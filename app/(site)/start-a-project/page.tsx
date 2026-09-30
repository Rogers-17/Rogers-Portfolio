import type { Metadata } from "next"
import ProjectWizard from "@/components/start-project/ProjectWizard"
import { getProjectFormSettings } from "@/lib/pages/queries"

export const metadata: Metadata = {
    title: "Start a Project | Rogers Portfolio",
    description: "Tell Rogers about your project in a few quick steps, then send it via WhatsApp, email, or request a call.",
}

export default async function StartAProjectPage () {
    const settings = await getProjectFormSettings()

    return (
        <main className="flex min-h-[calc(100dvh-72px)] w-full items-center bg-surface px-5 py-16 md:py-24">
            <ProjectWizard settings={settings} />
        </main>
    )
}
