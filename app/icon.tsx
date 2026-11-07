import { ImageResponse } from "next/og"
import { Monogram, atypRegular } from "@/lib/og"

// 192×192 (a multiple of 48, as Google Search asks). favicon.ico stays for legacy browsers.
export const size = { width: 192, height: 192 }
export const contentType = "image/png"

export default async function Icon () {
    return new ImageResponse(<Monogram size={size.width} />, {
        ...size,
        fonts: [{ name: "Atyp", data: await atypRegular(), weight: 400, style: "normal" }],
    })
}
