import TechnologiesManager from "@/components/admin/TechnologiesManager"
import { requireAdminPage } from "@/lib/admin/auth"
import { listTechnologiesForAdmin } from "@/lib/admin/queries"

export default async function AdminTechnologiesPage () {
    const { supabase } = await requireAdminPage()
    const technologies = await listTechnologiesForAdmin(supabase)

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Technologies</h1>
                <p className="mt-1 text-sm text-muted">Shared list used in each project&apos;s “Technologies Used” icon grid.</p>
            </div>
            <TechnologiesManager technologies={technologies} />
        </>
    )
}
