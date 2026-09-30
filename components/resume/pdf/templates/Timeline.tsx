import { Page, Text, View } from "@react-pdf/renderer"
import { BulletList, Icon, IconBadge, KeepWithNext, Paragraphs, SECTION_ICONS, contactLines, scaler, type TemplateProps } from "@/components/resume/pdf/shared"
import type { Entry, NormalizedSection } from "@/lib/resume/normalize"
import type { SectionType } from "@/lib/resume/schema"

// Based on 13.jpg: big bold name + title over a rule; left column (contact, skills,
// languages, references), right column on a vertical timeline with round section icons.

const INK = "#2a2a2a"
const MUTED = "#5f6368"
const LINE = "#9aa0a6"

const LEFT_TYPES: SectionType[] = ["skills", "languages", "references", "certifications", "coursework", "awards"]

export default function Timeline ({ contact, sections, design, accent }: TemplateProps) {
    const s = scaler(design)
    const body = { fontFamily: "Open Sans", fontSize: s(8.8), color: INK, lineHeight: 1.5 }
    const left = sections.filter(section => LEFT_TYPES.includes(section.type))
    const right = sections.filter(section => !LEFT_TYPES.includes(section.type))
    const badge = s(20)

    const leftHeading = (title: string) => (
        <View style={{ marginTop: s(16), marginBottom: s(7) }}>
            <Text style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: s(12.5), letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: s(3) }}>{title}</Text>
            <View style={{ height: 1.2, backgroundColor: accent }} />
        </View>
    )

    function leftSection (item: NormalizedSection) {
        return (
            <View key={item.id}>
                <KeepWithNext heading={leftHeading(item.title)}>
                {item.note ? <Text style={[body, { fontStyle: "italic", color: MUTED }]}>{item.note}</Text> : null}
                {item.kind === "list" ? <BulletList bullets={item.items} style={body} gap={s(2.5)} /> : null}
                {item.kind === "text" ? <Paragraphs text={item.text} style={body} /> : null}
                {item.kind === "entries" ? item.entries.map(entry => (
                    <View key={entry.id} style={{ marginBottom: s(7) }} wrap={false}>
                        {entry.title ? <Text style={[body, { fontFamily: "Montserrat", fontWeight: 700, fontSize: s(9.5) }]}>{entry.title}</Text> : null}
                        {entry.subtitle || entry.tag ? <Text style={body}>{[entry.subtitle, entry.tag].filter(Boolean).join(" / ")}</Text> : null}
                        {entry.date ? <Text style={[body, { color: MUTED }]}>{entry.date}</Text> : null}
                        {entry.lines.map((line, index) => <Text key={index} style={[body, { fontSize: s(8.3) }]}>{line}</Text>)}
                        {entry.text ? <Text style={body}>{entry.text}</Text> : null}
                    </View>
                )) : null}
                </KeepWithNext>
            </View>
        )
    }

    function rightEntry (item: Entry, type: SectionType) {
        const isEducation = type === "education"
        const primary = isEducation ? [item.title, item.tag].filter(Boolean).join(", ") : item.subtitle || item.title
        const secondary = isEducation ? [item.subtitle, item.location].filter(Boolean).join(" | ") : item.subtitle ? item.title : ""
        return (
            <View key={item.id} style={{ marginBottom: s(9) }}>
                {/* Small marker on the timeline for each entry. */}
                <View style={{ position: "absolute", left: -s(22) - 2.5, top: s(3), width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: LINE, backgroundColor: "#ffffff" }} />
                <View wrap={false}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={[body, { fontFamily: "Montserrat", fontWeight: 700, fontSize: s(9.5), flex: 1, paddingRight: s(8) }]}>{primary}</Text>
                        {item.date ? <Text style={[body, { fontSize: s(8.8) }]}>{item.date}</Text> : null}
                    </View>
                    {secondary ? <Text style={[body, { color: MUTED }]}>{secondary}</Text> : null}
                    {!isEducation && item.location ? <Text style={[body, { color: MUTED, fontSize: s(8.3) }]}>{item.location}</Text> : null}
                    {item.bulletsLabel ? <Text style={[body, { fontStyle: "italic", color: MUTED, marginTop: s(1) }]}>{item.bulletsLabel}</Text> : null}
                </View>
                {item.text ? <Paragraphs text={item.text} style={[body, { marginTop: s(2) }]} /> : null}
                {item.url ? <Text style={[body, { color: MUTED }]}>{item.url.replace(/^https?:\/\//, "")}</Text> : null}
                {item.bullets.length ? <View style={{ paddingLeft: s(8), marginTop: s(3) }}><BulletList bullets={item.bullets} style={[body, { textAlign: "justify" }]} gap={s(1.5)} /></View> : null}
            </View>
        )
    }

    function rightSection (item: NormalizedSection) {
        return (
            <View key={item.id} style={{ marginBottom: s(8) }}>
                <KeepWithNext heading={
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: s(7) }}>
                    <View style={{ position: "absolute", left: -s(22) - badge / 2 }}>
                        <IconBadge name={SECTION_ICONS[item.type] ?? "info"} size={badge} color={INK} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: s(12.5), letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: s(3) }}>{item.title}</Text>
                        <View style={{ height: 1.2, backgroundColor: accent }} />
                    </View>
                </View>}>
                {item.note ? <Text style={[body, { fontStyle: "italic", color: MUTED }]}>{item.note}</Text> : null}
                {item.kind === "text" ? <Paragraphs text={item.type === "summary" ? `“${item.text}”` : item.text} style={[body, { textAlign: "justify" }]} /> : null}
                {item.kind === "list" ? <BulletList bullets={item.items} style={body} /> : null}
                {item.kind === "entries" ? item.entries.map(entry => rightEntry(entry, item.type)) : null}
                </KeepWithNext>
            </View>
        )
    }

    const contactItems = contactLines(contact)
    const details = contact.details.filter(detail => detail.label.trim() && detail.value.trim())

    return (
        <Page size={design.paper} style={{ paddingTop: s(38), paddingBottom: s(36), paddingHorizontal: s(38), backgroundColor: "#ffffff" }}>
            <Text style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: s(27), letterSpacing: 1, color: accent, textTransform: "uppercase" }}>{contact.fullName || "Your Name"}</Text>
            {contact.headline.trim() ? <Text style={{ fontFamily: "Montserrat", fontSize: s(12.5), letterSpacing: 1.5, color: INK, textTransform: "uppercase", marginTop: s(2) }}>{contact.headline.trim()}</Text> : null}
            <View style={{ height: 1.4, backgroundColor: accent, marginTop: s(10), marginBottom: s(2) }} />

            <View style={{ flexDirection: "row" }}>
                <View style={{ width: "34%", paddingRight: s(16) }}>
                    {contactItems.length || details.length ? (
                        <View>
                            {leftHeading("Contact")}
                            {contactItems.map(line => (
                                <View key={line.icon} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: s(6) }}>
                                    <View style={{ marginTop: 1.5 }}><Icon name={line.icon} size={s(8.5)} color={INK} /></View>
                                    <Text style={[body, { marginLeft: s(8), flex: 1 }]}>{line.text}</Text>
                                </View>
                            ))}
                            {details.map(detail => (
                                <View key={detail.id} style={{ flexDirection: "row", marginBottom: s(6) }}>
                                    <View style={{ marginTop: 1.5 }}><Icon name="calendar" size={s(8.5)} color={INK} /></View>
                                    <Text style={[body, { marginLeft: s(8), flex: 1 }]}>{detail.label.trim()}: {detail.value.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                    {left.map(leftSection)}
                </View>
                <View style={{ flex: 1, marginLeft: s(6), paddingLeft: s(22), paddingTop: s(16), borderLeftWidth: 1, borderLeftColor: LINE }}>
                    {right.map(rightSection)}
                </View>
            </View>
        </Page>
    )
}
