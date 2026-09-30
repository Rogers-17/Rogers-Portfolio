// Browser-side: downscale a photo so its long edge is at most `maxEdge` px and re-encode it
// as WebP. Phone photos (3–10 MB) end up well under the 2 MB site-images limit. EXIF
// orientation is applied by createImageBitmap. Returns the original file if it can't be decoded.

export type ResizedImage = { file: File, width: number, height: number }

export async function resizeImage (file: File, maxEdge = 2400, quality = 0.85): Promise<ResizedImage | null> {
    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
        return null
    }

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
        bitmap.close()
        return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality))
    if (!blob || blob.type !== "image/webp") return null

    const name = file.name.replace(/\.[^.]+$/, "") || "photo"
    return { file: new File([blob], `${name}.webp`, { type: "image/webp" }), width, height }
}

// Reads the pixel size of an image file without re-encoding it.
export async function imageSize (file: File): Promise<{ width: number, height: number } | null> {
    try {
        const bitmap = await createImageBitmap(file)
        const size = { width: bitmap.width, height: bitmap.height }
        bitmap.close()
        return size
    } catch {
        return null
    }
}
