import { ImageResponse } from "next/og"
import { Monogram, atypRegular } from "@/lib/og"

// Apple touch icon. iOS applies its own rounding, so it just needs a full-bleed square.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default async function AppleIcon () {
    return new ImageResponse(<Monogram size={size.width} rounded={false} />, {
        ...size,
        fonts: [{ name: "Atyp", data: await atypRegular(), weight: 400, style: "normal" }],
    })
}
