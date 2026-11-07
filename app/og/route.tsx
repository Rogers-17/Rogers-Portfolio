import { ImageResponse } from "next/og"
import { BRAND, atypRegular } from "@/lib/og"
import { SITE_HOST, site } from "@/lib/site"

// GET /og: the default 1200×630 social preview for pages without their own cover image.
// An explicit route (not opengraph-image.tsx) because file-based metadata would override the
// project/blog cover images that pages set in their metadata.
export const dynamic = "force-static"

export async function GET () {
    const font = await atypRegular()

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    backgroundColor: BRAND.surface,
                    backgroundImage: `radial-gradient(60% 80% at 85% 30%, rgba(117,28,255,0.35), transparent 70%), radial-gradient(40% 60% at 10% 100%, rgba(222,14,255,0.18), transparent 70%)`,
                    fontFamily: "Atyp",
                    color: BRAND.fg,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 56, height: 8, borderRadius: 8, background: `linear-gradient(90deg, ${BRAND.accent1}, ${BRAND.accent2})` }} />
                    <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: BRAND.muted }}>Portfolio</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ fontSize: 92, lineHeight: 1.05, color: "#ffffff" }}>{site.name}</div>
                    <div
                        style={{
                            fontSize: 48,
                            lineHeight: 1.2,
                            backgroundImage: `linear-gradient(65deg, ${BRAND.accent1}, ${BRAND.accent2})`,
                            backgroundClip: "text",
                            color: "transparent",
                        }}
                    >
                        {site.jobTitle}
                    </div>
                </div>

                <div style={{ fontSize: 28, color: BRAND.muted }}>{SITE_HOST}</div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: [{ name: "Atyp", data: font, weight: 400, style: "normal" }],
        },
    )
}
