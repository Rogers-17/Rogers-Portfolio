import { Image, Page, Text, View } from "@react-pdf/renderer"
import { BulletList, KeepWithNext, Paragraphs, scaler, type TemplateProps } from "@/components/resume/pdf/shared"
import type { Entry, NormalizedSection } from "@/lib/resume/normalize"
import { PROFESSIONAL_GOLD } from "@/lib/resume/schema"

// Based on the uploaded Resume.pdf: photo header, navy name, gold italic headline, navy
// headings over a gold rule, "Role | dates" with gold dates, italic organisation lines.

const INK = "#222222"
const MUTED = "#555555"

export default function Professional ({ contact, sections, design, accent, photoUrl }: TemplateProps) {
    const s = scaler(design)
    const gold = PROFESSIONAL_GOLD
    const body = { fontFamily: "Carlito", fontSize: s(11), color: INK, lineHeight: 1.3 }

    const details = [
        ...contact.details.filter(detail => detail.label.trim() && detail.value.trim()).map(detail => ({ label: detail.label.trim(), value: detail.value.trim() })),
        ...(contact.location.trim() ? [{ label: "Address", value: contact.location.trim() }] : []),
        ...(contact.email.trim() ? [{ label: "Email", value: contact.email.trim(), link: true }] : []),
        ...(contact.phone.trim() ? [{ label: "Phone", value: contact.phone.trim() }] : []),
        ...(contact.linkedin.trim() ? [{ label: "LinkedIn", value: contact.linkedin.trim().replace(/^https?:\/\//, "") }] : []),
        ...(contact.website.trim() ? [{ label: "Website", value: contact.website.trim().replace(/^https?:\/\//, "") }] : []),
    ]

    const showPhoto = design.showPhoto && photoUrl

    function heading (title: string) {
        return (
            <View style={{ marginTop: s(16), marginBottom: s(8) }}>
                <Text style={{ fontFamily: "Carlito", fontWeight: 700, fontSize: s(16), color: accent, textTransform: "uppercase", marginBottom: s(3) }}>{title}</Text>
                <View style={{ height: 1, backgroundColor: gold }} />
            </View>
        )
    }

    function experienceEntry (item: Entry) {
        const org = [item.subtitle, item.location].filter(Boolean).join("  •  ")
        return (
            <View key={item.id} style={{ marginBottom: s(9) }}>
                <View wrap={false}>
                    <Text style={{ fontFamily: "Carlito", fontSize: s(13.5), fontWeight: 700, color: accent }}>
                        {item.title}
                        {item.date ? <Text style={{ color: gold }}>{"   |   "}</Text> : null}
                        {item.date ? <Text style={{ color: gold, fontSize: s(12) }}>{item.date}</Text> : null}
                    </Text>
                    {org ? <Text style={[body, { fontStyle: "italic", fontSize: s(12), color: "#333333", marginTop: s(1) }]}>{org}</Text> : null}
                    {item.bulletsLabel ? <Text style={{ fontFamily: "Carlito", fontStyle: "italic", fontWeight: 700, fontSize: s(10), color: accent, marginTop: s(3), marginBottom: s(2) }}>{item.bulletsLabel}</Text> : null}
                </View>
                {item.text ? <Paragraphs text={item.text} style={[body, { marginTop: s(2) }]} /> : null}
                {item.bullets.length ? (
                    <View style={{ paddingLeft: s(10), marginTop: item.bulletsLabel ? 0 : s(3) }}>
                        <BulletList bullets={item.bullets} style={[body, { fontSize: s(12) }]} gap={s(1.5)} />
                    </View>
                ) : null}
            </View>
        )
    }

    // Education-style entries: "date — credential", then the title, then the italic institution.
    function compactEntry (item: Entry) {
        const where = [item.subtitle, item.location].filter(Boolean).join(", ")
        const first = [item.date, item.tag].filter(Boolean)
        return (
            <View key={item.id} style={{ marginBottom: s(8) }} wrap={false}>
                {first.length ? (
                    <Text style={{ fontFamily: "Carlito", fontWeight: 700, fontSize: s(11), color: accent }}>
                        {item.date}
                        {item.date && item.tag ? "  —  " : ""}
                        {item.tag ? <Text style={{ color: INK }}>{item.tag}</Text> : null}
                    </Text>
                ) : null}
                {item.title ? <Text style={[body, { fontSize: s(11.5), fontWeight: first.length ? 400 : 700, color: first.length ? INK : accent }]}>{item.title}</Text> : null}
                {where ? <Text style={[body, { fontStyle: "italic", fontSize: s(9.5), color: MUTED }]}>{where}</Text> : null}
                {item.text ? <Text style={[body, { fontSize: s(10), marginTop: s(1) }]}>{item.text}</Text> : null}
                {item.url ? <Text style={[body, { fontSize: s(9.5), color: MUTED }]}>{item.url}</Text> : null}
                {item.bullets.length ? <View style={{ paddingLeft: s(10), marginTop: s(2) }}><BulletList bullets={item.bullets} style={[body, { fontSize: s(10.5) }]} /></View> : null}
            </View>
        )
    }

    function referenceEntry (item: Entry) {
        return (
            <View key={item.id} style={{ marginBottom: s(9) }} wrap={false}>
                <Text style={{ fontFamily: "Carlito", fontWeight: 700, fontSize: s(11.5), color: accent }}>{item.title}</Text>
                {item.subtitle ? <Text style={[body, { fontSize: s(11) }]}>{item.subtitle}</Text> : null}
                {item.lines.map((line, index) => <Text key={index} style={[body, { fontStyle: "italic", fontSize: s(9.5), color: MUTED }]}>{line}</Text>)}
            </View>
        )
    }

    function section (item: NormalizedSection) {
        return (
            <View key={item.id}>
                <KeepWithNext heading={heading(item.title)}>
                {item.note ? <Text style={[body, { fontStyle: "italic", color: MUTED, marginBottom: s(4) }]}>{item.note}</Text> : null}
                {item.kind === "text" ? <Paragraphs text={item.text} style={[body, { fontSize: s(11.5) }]} /> : null}
                {item.kind === "list" ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {item.items.map((entry, index) => (
                            <Text key={index} style={[body, { width: "33.3%", paddingRight: s(8), marginBottom: s(2) }]}>• {entry}</Text>
                        ))}
                    </View>
                ) : null}
                {item.kind === "entries" ? item.entries.map(entry => (
                    item.type === "experience" || item.type === "involvement" || (item.type === "projects" && entry.bullets.length > 0)
                        ? experienceEntry(entry)
                        : item.type === "references" ? referenceEntry(entry) : compactEntry(entry)
                )) : null}
                </KeepWithNext>
            </View>
        )
    }

    return (
        <Page size={design.paper} style={{ paddingTop: s(40), paddingBottom: s(40), paddingHorizontal: s(50), backgroundColor: "#ffffff" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                {showPhoto ? (
                    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
                    <Image src={photoUrl} style={{ width: s(118), height: s(118), objectFit: "cover", marginRight: s(16) }} />
                ) : null}
                <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Carlito", fontWeight: 700, fontSize: s(28), color: accent, lineHeight: 1.1 }}>{contact.fullName.toUpperCase() || "YOUR NAME"}</Text>
                    {contact.headline.trim() ? <Text style={{ fontFamily: "Carlito", fontStyle: "italic", fontSize: s(14), color: gold, marginTop: s(4), marginBottom: s(4) }}>{contact.headline.trim()}</Text> : null}
                    {details.map(detail => (
                        <Text key={detail.label} style={[body, { fontSize: s(11), lineHeight: 1.35 }]}>
                            <Text style={{ fontWeight: 700 }}>{detail.label}: </Text>
                            <Text style={"link" in detail ? { color: "#1f5fd1" } : {}}>{detail.value}</Text>
                        </Text>
                    ))}
                </View>
            </View>
            {sections.map(section)}
        </Page>
    )
}
