import { notFound } from "next/navigation"
import ResumeEditor from "@/components/resume/ResumeEditor"
import { requireAdminPage } from "@/lib/admin/auth"
import { uuidSchema } from "@/lib/admin/schemas"
import { usageSummary } from "@/lib/ai/openrouter"
import { getResume, signPhoto } from "@/lib/resume/queries"

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: "Resume editor | Rogers admin", robots: { index: false, follow: false } }

export default async function ResumeEditorPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const resume = await getResume(supabase, id.data)
    if (!resume) notFound()

    const [photoUrl, usage] = await Promise.all([
        signPhoto(supabase, resume.data.contact.photoPath),
        usageSummary(supabase).catch(() => null),
    ])

    return <ResumeEditor key={resume.id} resume={resume} photoUrl={photoUrl} usage={usage} />
}
