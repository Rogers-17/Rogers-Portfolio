import ContentList from "@/components/admin/ContentList"
import GalleryPageForm from "@/components/admin/GalleryPageForm"
import GalleryUploader from "@/components/admin/GalleryUploader"
import SeedNotice from "@/components/admin/SeedNotice"
import { requireAdminPage } from "@/lib/admin/auth"
import { getGalleryForAdmin, listGalleryPhotosForAdmin } from "@/lib/admin/page-queries"

export default async function AdminGalleryPage () {
    const { supabase } = await requireAdminPage()
    const [{ exists, ...page }, photos] = await Promise.all([getGalleryForAdmin(supabase), listGalleryPhotosForAdmin(supabase)])

    return (
        <>
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl font-bold md:text-3xl">Gallery</h1>
                <p className="mt-1 text-sm text-muted">The hero text and photo, plus the photo grid on /gallery.</p>
            </div>
            <SeedNotice show={!exists} />
            <GalleryPageForm page={page} />

            <section className="mt-10" aria-labelledby="photos-heading">
                <div className="mb-4">
                    <h2 id="photos-heading" className="text-lg font-bold">Photos</h2>
                    <p className="mt-1 text-sm text-muted">The order here is the order in the grid.</p>
                </div>
                <div className="flex flex-col gap-4">
                    <GalleryUploader />
                    {photos.length > 0 && (
                        <ContentList
                            items={photos.map(photo => ({
                                id: photo.id,
                                title: photo.alt,
                                subtitle: photo.caption,
                                meta: `${photo.width} × ${photo.height}`,
                                imageUrl: photo.url,
                                initials: "",
                                editHref: `/admin/gallery/photos/${photo.id}`,
                                switches: [{ field: "is_published", label: "Published", checked: photo.is_published }],
                            }))}
                            endpoint="/api/admin/gallery-photos"
                            itemLabel="Photo"
                            allowDelete
                            emptyTitle="No photos yet"
                            emptyHint="Upload photos above."
                            newHref="/admin/gallery"
                        />
                    )}
                </div>
            </section>
        </>
    )
}
