import "server-only"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Shared brand pieces for generated images (/og, /icon, /apple-icon). ImageResponse only
// accepts ttf/otf/woff, so the .woff cut of Atyp Display is used (the .woff2 files can't be).

export const BRAND = { surface: "#05000a", accent1: "#de0eff", accent2: "#751cff", fg: "#e8e6f0", muted: "#a59fb8" }

export async function atypRegular () {
    return readFile(join(process.cwd(), "assets/fonts/AtypDisplay-Regular.woff"))
}

// "R" monogram on the brand gradient, used for the favicon-size and Apple touch icons.
export function Monogram ({ size, rounded = true }: { size: number, rounded?: boolean }) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${BRAND.accent1}, ${BRAND.accent2})`,
                borderRadius: rounded ? size * 0.22 : 0,
                color: "#ffffff",
                fontSize: size * 0.62,
                fontFamily: "Atyp",
                lineHeight: 1,
            }}
        >
            R
        </div>
    )
}
