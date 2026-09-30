import { Page, Text, View } from "@react-pdf/renderer"
import { BulletList, Icon, KeepWithNext, Paragraphs, contactLines, scaler, type TemplateProps } from "@/components/resume/pdf/shared"
import type { Entry, NormalizedSection } from "@/lib/resume/normalize"

// Based on 14.webp: centred bold name + title, icon contact row over a rule, single-column
// sections with spaced uppercase headings and a rule after each section, dark footer bar.

const INK = "#262626"
const MUTED = "#6b6b6b"
const RULE = "#9a9a9a"

export default function Classic ({ contact, sections, design, accent }: TemplateProps) {
    const s = scaler(design)
    const body = { fontFamily: "Open Sans", fontSize: s(9.5), color: INK, lineHeight: 1.55 }
    const lines = contactLines(contact).slice(0, 4)

    function entry (item: Entry) {
        const meta = [item.subtitle, item.location, item.date].filter(Boolean).join(" | ")
        return (
            <View key={item.id} style={{ marginBottom: s(9) }}>
                <View wrap={false}>
                    {meta ? <Text style={[body, { color: MUTED }]}>{meta}</Text> : null}
                    {item.title || item.tag ? <Text style={[body, { fontWeight: 700, fontSize: s(10) }]}>{[item.title, item.tag].filter(Boolean).join(", ")}</Text> : null}
                    {item.bulletsLabel ? <Text style={[body, { fontStyle: "italic", color: MUTED }]}>{item.bulletsLabel}</Text> : null}
                </View>
                {item.text ? <Paragraphs text={item.text} style={body} /> : null}
                {item.lines.map((line, index) => <Text key={index} style={[body, { color: MUTED }]}>{line}</Text>)}
                {item.url ? <Text style={[body, { color: MUTED }]}>{item.url.replace(/^https?:\/\//, "")}</Text> : null}
                {item.bullets.length ? <View style={{ paddingLeft: s(4), marginTop: s(1) }}><BulletList bullets={item.bullets} style={body} gap={s(1)} /></View> : null}
            </View>
        )
    }

    function section (item: NormalizedSection, index: number) {
        return (
            <View key={item.id} style={{ paddingTop: s(12) }}>
                <KeepWithNext heading={<Text style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: s(12.5), letterSpacing: 1.8, color: accent, textTransform: "uppercase", marginBottom: s(6) }}>{item.title}</Text>}>
                {item.note ? <Text style={[body, { fontStyle: "italic", color: MUTED }]}>{item.note}</Text> : null}
                {item.kind === "text" ? <Paragraphs text={item.text} style={body} /> : null}
                {item.kind === "list" ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {item.items.map((entryText, entryIndex) => (
                            <View key={entryIndex} style={{ width: "33.3%", flexDirection: "row", paddingRight: s(6), marginBottom: s(1) }}>
                                <Text style={[body, { width: 10 }]}>•</Text>
                                <Text style={[body, { flex: 1 }]}>{entryText}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
                {item.kind === "entries" ? item.entries.map(entry) : null}
                </KeepWithNext>
                {index < sections.length - 1 ? <View style={{ height: 0.8, backgroundColor: RULE, marginTop: s(10) }} /> : null}
            </View>
        )
    }

    return (
        <Page size={design.paper} style={{ paddingTop: s(42), paddingBottom: s(46), paddingHorizontal: s(52), backgroundColor: "#ffffff" }}>
            <View fixed style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: s(18), backgroundColor: "#555555" }} />
            <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: s(28), letterSpacing: 1.5, color: accent, textTransform: "uppercase", textAlign: "center" }}>{contact.fullName || "Your Name"}</Text>
                {contact.headline.trim() ? <Text style={{ fontFamily: "Open Sans", fontSize: s(13), color: INK, marginTop: s(2) }}>{contact.headline.trim()}</Text> : null}
            </View>
            {lines.length ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", marginTop: s(14), paddingBottom: s(6) }}>
                    {lines.map(line => (
                        <View key={line.icon} style={{ flexDirection: "row", alignItems: "center", marginBottom: s(2) }}>
                            <Icon name={line.icon} size={s(8.5)} color={INK} />
                            <Text style={[body, { marginLeft: s(5), fontSize: s(9) }]}>{line.text}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
            <View style={{ height: 0.8, backgroundColor: RULE }} />
            {contact.details.filter(detail => detail.label.trim() && detail.value.trim()).length ? (
                <Text style={[body, { textAlign: "center", marginTop: s(4), color: MUTED }]}>
                    {contact.details.filter(detail => detail.label.trim() && detail.value.trim()).map(detail => `${detail.label.trim()}: ${detail.value.trim()}`).join("   ·   ")}
                </Text>
            ) : null}
            {sections.map(section)}
        </Page>
    )
}
