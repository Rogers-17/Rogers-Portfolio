import Link from "next/link"
import { FiPlus } from "react-icons/fi"
import ProjectsTable from "@/components/admin/ProjectsTable"
import { primaryButtonClass } from "@/components/admin/Field"
import { requireAdminPage } from "@/lib/admin/auth"
import { listProjectsForAdmin } from "@/lib/admin/queries"

export default async function AdminProjectsPage () {
    const { supabase } = await requireAdminPage()
    const projects = await listProjectsForAdmin(supabase)

    return (
        <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold md:text-3xl">Projects</h1>
                    <p className="mt-1 text-sm text-muted">Order here is the order on the site. Featured projects appear on the homepage.</p>
                </div>
                <Link href="/admin/projects/new" className={primaryButtonClass}>
                    <FiPlus aria-hidden="true" />
                    New project
                </Link>
            </div>
            <ProjectsTable initialProjects={projects} />
        </>
    )
}
