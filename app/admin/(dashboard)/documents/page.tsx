import DocumentArchive from "@/components/documents/DocumentArchive"
import { requireAdminPage } from "@/lib/admin/auth"
import { listDocuments } from "@/lib/documents/queries"
import { parseDocumentFilter, todayIso } from "@/lib/documents/schema"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export const metadata = { title: "Documents | Rogers admin" }

export default async function DocumentsPage ({ searchParams }: Props) {
    const filter = parseDocumentFilter(await searchParams)
    const { supabase } = await requireAdminPage()
    const documents = await listDocuments(supabase)

    return <DocumentArchive initialDocuments={documents} initialFilter={filter} today={todayIso()} />
}
