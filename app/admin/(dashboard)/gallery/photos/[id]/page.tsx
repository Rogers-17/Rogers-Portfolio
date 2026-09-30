import { notFound } from "next/navigation"
import GalleryPhotoForm from "@/components/admin/GalleryPhotoForm"
import { requireAdminPage } from "@/lib/admin/auth"
import { getGalleryPhotoForAdmin } from "@/lib/admin/page-queries"
import { uuidSchema } from "@/lib/admin/schemas"

type Props = { params: Promise<{ id: string }> }

export default async function EditGalleryPhotoPage ({ params }: Props) {
    const id = uuidSchema.safeParse((await params).id)
    if (!id.success) notFound()

    const { supabase } = await requireAdminPage()
    const photo = await getGalleryPhotoForAdmin(supabase, id.data)
    if (!photo) notFound()

    return <GalleryPhotoForm key={photo.id} photo={photo} />
}
