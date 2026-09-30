import * as React from "react"
import { Circle, Font, Path, Rect, Svg, Text, View, type Styles } from "@react-pdf/renderer"
import type { ResumeContact, ResumeDesign } from "@/lib/resume/schema"

// Shared PDF building blocks for every template (fonts, icons, scale, bullets).

let registered = false

// Fonts are served from /public/fonts/resume (open licences). `base` is the site origin in
// the browser or an absolute file path when rendering on the server.
export function registerResumeFonts (base: string) {
    if (registered) return
    registered = true
    const src = (file: string) => `${base.replace(/\/$/, "")}/fonts/resume/${file}`
    Font.register({
        family: "Montserrat",
        fonts: [
            { src: src("montserrat-latin-400-normal.woff"), fontWeight: 400 },
            { src: src("montserrat-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
            { src: src("montserrat-latin-500-normal.woff"), fontWeight: 500 },
            { src: src("montserrat-latin-600-normal.woff"), fontWeight: 600 },
            { src: src("montserrat-latin-700-normal.woff"), fontWeight: 700 },
            { src: src("montserrat-latin-800-normal.woff"), fontWeight: 800 },
        ],
    })
    Font.register({
        family: "Open Sans",
        fonts: [
            { src: src("open-sans-latin-400-normal.woff"), fontWeight: 400 },
            { src: src("open-sans-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
            { src: src("open-sans-latin-600-normal.woff"), fontWeight: 600 },
            { src: src("open-sans-latin-600-italic.woff"), fontWeight: 600, fontStyle: "italic" },
            { src: src("open-sans-latin-700-normal.woff"), fontWeight: 700 },
        ],
    })
    Font.register({
        family: "Carlito",
        fonts: [
            { src: src("carlito-latin-400-normal.woff"), fontWeight: 400 },
            { src: src("carlito-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
            { src: src("carlito-latin-700-normal.woff"), fontWeight: 700 },
            { src: src("carlito-latin-700-italic.woff"), fontWeight: 700, fontStyle: "italic" },
        ],
    })
    // Never hyphenate names, emails or URLs.
    Font.registerHyphenationCallback(word => [word])
}

type FlatStyle = Styles[string]
type TextStyle = FlatStyle | FlatStyle[]

// First non-array style's colour (used for bullet markers).
const colorOf = (style: TextStyle) => ([] as FlatStyle[]).concat(style as FlatStyle).map(entry => (entry as { color?: string }).color).filter(Boolean).pop()

export type TemplateProps = {
    contact: ResumeContact
    sections: import("@/lib/resume/normalize").NormalizedSection[]
    design: ResumeDesign
    accent: string
    photoUrl: string | null
}

const SCALE: Record<ResumeDesign["density"], number> = { compact: 0.92, normal: 1, relaxed: 1.07 }

// Font sizes and spacing scale with the density setting.
export function scaler (design: ResumeDesign) {
    const factor = SCALE[design.density]
    return (value: number) => Math.round(value * factor * 10) / 10
}

// ---------------------------------------------------------------------------
// Icons (Lucide paths, 24×24 viewBox, drawn as strokes)
// ---------------------------------------------------------------------------

const ICON_PATHS = {
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"],
    mail: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"],
    pin: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
    linkedin: ["M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z", "M2 9h4v12H2z", "M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
    user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
    briefcase: ["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", "M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"],
    graduation: ["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c3 3 9 3 12 0v-5"],
    star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
    award: ["M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M8.21 13.89 7 23l5-3 5 3-1.21-9.12"],
    code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
    info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
    calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
} as const

export type IconName = keyof typeof ICON_PATHS

export function Icon ({ name, size, color, strokeWidth = 2 }: { name: IconName, size: number, color: string, strokeWidth?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            {ICON_PATHS[name].map((d, index) => (
                <Path key={index} d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
        </Svg>
    )
}

// A filled circle with a white icon (timeline template section markers).
export function IconBadge ({ name, size, color }: { name: IconName, size: number, color: string }) {
    const inner = size * 0.55
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
            </Svg>
            <View style={{ position: "absolute", top: (size - inner) / 2, left: (size - inner) / 2 }}>
                <Icon name={name} size={inner} color="#ffffff" strokeWidth={2.2} />
            </View>
        </View>
    )
}

export const SECTION_ICONS: Record<string, IconName> = {
    summary: "user",
    experience: "briefcase",
    education: "graduation",
    skills: "star",
    projects: "code",
    certifications: "award",
    involvement: "user",
    awards: "award",
    languages: "globe",
    coursework: "graduation",
    references: "user",
    custom: "info",
}

// Contact lines with icons, in a stable order.
export function contactLines (contact: ResumeContact): { icon: IconName, text: string }[] {
    const clean = (value: string) => value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")
    return [
        { icon: "phone" as const, text: contact.phone.trim() },
        { icon: "mail" as const, text: contact.email.trim() },
        { icon: "pin" as const, text: contact.location.trim() },
        { icon: "linkedin" as const, text: clean(contact.linkedin) },
        { icon: "globe" as const, text: clean(contact.website) },
    ].filter(line => line.text)
}

export function BulletList ({ bullets, style, bulletColor, marker = "•", gap = 2 }: { bullets: string[], style: TextStyle, bulletColor?: string, marker?: string, gap?: number }) {
    const flat = ([] as FlatStyle[]).concat(style as FlatStyle)
    return (
        <View>
            {bullets.map((bullet, index) => (
                <View key={index} style={{ flexDirection: "row", marginTop: index === 0 ? 0 : gap }} wrap={false}>
                    <Text style={[...flat, { width: 10, color: bulletColor ?? colorOf(style) }]}>{marker}</Text>
                    <Text style={[...flat, { flex: 1 }]}>{bullet}</Text>
                </View>
            ))}
        </View>
    )
}

export function Paragraphs ({ text, style, gap = 4 }: { text: string, style: TextStyle, gap?: number }) {
    const flat = ([] as FlatStyle[]).concat(style as FlatStyle)
    return (
        <View>
            {text.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).map((part, index) => (
                <Text key={index} style={[...flat, { marginTop: index === 0 ? 0 : gap }]}>{part}</Text>
            ))}
        </View>
    )
}

// Two-tone horizontal rule.
export function Rule ({ color, thickness = 1, marginTop = 0, marginBottom = 0 }: { color: string, thickness?: number, marginTop?: number, marginBottom?: number }) {
    return <View style={{ height: thickness, backgroundColor: color, marginTop, marginBottom }} />
}

export function Ribbon ({ label, color, height, fontSize, fontFamily }: { label: string, color: string, height: number, fontSize: number, fontFamily: string }) {
    const notch = height * 0.9
    return (
        <View style={{ height, flexDirection: "row", alignItems: "center" }} wrap={false}>
            <Svg width={notch} height={height} viewBox={`0 0 ${notch} ${height}`}>
                <Rect x={0} y={0} width={notch} height={height} fill="#ffffff" />
                <Path d={`M ${notch} 0 L ${notch} ${height} L 0 ${height} Z`} fill={color} />
            </Svg>
            <View style={{ flex: 1, height, backgroundColor: color, justifyContent: "center" }}>
                <Text style={{ fontFamily, fontSize, fontWeight: 700, letterSpacing: 2, color: "#ffffff", textAlign: "center", textTransform: "uppercase" }}>{label}</Text>
            </View>
        </View>
    )
}

export const Spacer = ({ size }: { size: number }) => <View style={{ height: size }} />


// Keeps a section heading on the same page as the start of its content (react-pdf's
// minPresenceAhead isn't reliable across nested views). Long first items still move as one.
export function KeepWithNext ({ heading, children }: { heading: React.ReactNode, children: React.ReactNode }) {
    const [first, ...rest] = React.Children.toArray(children)
    return (
        <>
            <View wrap={false}>
                {heading}
                {first}
            </View>
            {rest}
        </>
    )
}
