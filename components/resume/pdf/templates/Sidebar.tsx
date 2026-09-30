import { Image, Page, Text, View } from "@react-pdf/renderer"
import { BulletList, Icon, KeepWithNext, Paragraphs, Ribbon, contactLines, scaler, type TemplateProps } from "@/components/resume/pdf/shared"
import type { Entry, NormalizedSection } from "@/lib/resume/normalize"
import type { SectionType } from "@/lib/resume/schema"

// Based on 15.jpg: a coloured sidebar (repeats on every page) with a round photo, contact,
// education and skills; a two-line name and angled ribbon headings on the right.

const INK = "#1f1f1f"
const MUTED = "#555555"

const SIDE_TYPES: SectionType[] = ["education", "skills", "languages", "certifications", "coursework"]

export default function Sidebar ({ contact, sections, design, accent, photoUrl }: TemplateProps) {
    const s = scaler(design)
    const body = { fontFamily: "Open Sans", fontSize: s(9), color: INK, lineHeight: 1.5 }
    const side = { ...body, color: "#ffffff" }
    const sideSections = sections.filter(section => SIDE_TYPES.includes(section.type))
    const mainSections = sections.filter(section => !SIDE_TYPES.includes(section.type))

    const nameParts = (contact.fullName.trim() || "Your Name").split(/\s+/)
    const lastName = nameParts.length > 1 ? nameParts.pop() : ""
    const firstName = nameParts.join(" ")

    const sideHeading = (title: string) => (
        <Text style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: s(12.5), letterSpacing: 1.2, color: "#ffffff", textTransform: "uppercase", marginTop: s(18), marginBottom: s(8) }}>{title}</Text>
    )

    function sideSection (item: NormalizedSection) {
        return (
            <View key={item.id}>
                <KeepWithNext heading={sideHeading(item.title)}>
                {item.note ? <Text style={[side, { fontStyle: "italic" }]}>{item.note}</Text> : null}
                {item.kind === "list" ? <BulletList bullets={item.items} style={side} gap={s(4)} /> : null}
                {item.kind === "text" ? <Paragraphs text={item.text} style={side} /> : null}
                {item.kind === "entries" ? (
                    <BulletList
                        bullets={item.entries.map(entry => [
                            [entry.tag, entry.title].filter(Boolean).join(" "),
                            [entry.subtitle, entry.date].filter(Boolean).join(", "),
                        ].filter(Boolean).join("\n"))}
                        style={side}
                        gap={s(6)}
                    />
                ) : null}
                </KeepWithNext>
            </View>
        )
    }

    function mainEntry (item: Entry) {
        const header = [item.title, item.subtitle, item.location, item.date].filter(Boolean).join(" | ")
        return (
            <View key={item.id} style={{ marginBottom: s(9) }}>
                <View wrap={false}>
                    {header ? <Text style={[body, { fontWeight: 600 }]}>{header}</Text> : null}
                    {item.tag ? <Text style={[body, { color: MUTED }]}>{item.tag}</Text> : null}
                    {item.bulletsLabel ? <Text style={[body, { fontStyle: "italic", color: MUTED }]}>{item.bulletsLabel}</Text> : null}
                </View>
                {item.text ? <Paragraphs text={item.text} style={body} /> : null}
                {item.lines.map((line, index) => <Text key={index} style={[body, { color: MUTED }]}>{line}</Text>)}
                {item.url ? <Text style={[body, { color: MUTED }]}>{item.url.replace(/^https?:\/\//, "")}</Text> : null}
                {item.bullets.length ? <View style={{ paddingLeft: s(14), marginTop: s(3) }}><BulletList bullets={item.bullets} style={body} gap={s(3)} /></View> : null}
            </View>
        )
    }

    function mainSection (item: NormalizedSection) {
        return (
            <View key={item.id} style={{ marginBottom: s(10) }}>
                <KeepWithNext heading={
                <View style={{ marginBottom: s(8) }}>
                    <Ribbon label={item.title} color={accent} height={s(20)} fontSize={s(12)} fontFamily="Montserrat" />
                </View>}>
                {item.note ? <Text style={[body, { fontStyle: "italic", color: MUTED, textAlign: "center" }]}>{item.note}</Text> : null}
                {item.kind === "text" ? <Paragraphs text={item.text} style={[body, { textAlign: "center" }]} /> : null}
                {item.kind === "list" ? <BulletList bullets={item.items} style={body} /> : null}
                {item.kind === "entries" ? item.entries.map(mainEntry) : null}
                </KeepWithNext>
            </View>
        )
    }

    const showPhoto = design.showPhoto && photoUrl
    const photoSize = s(128)

    return (
        <Page size={design.paper} style={{ paddingTop: s(30), paddingBottom: s(30), backgroundColor: "#ffffff" }}>
            <View fixed style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "35%", backgroundColor: accent }} />
            <View style={{ flexDirection: "row" }}>
                <View style={{ width: "35%", paddingHorizontal: s(22) }}>
                    {showPhoto ? (
                        <View style={{ alignItems: "center", marginBottom: s(4) }}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
                            <Image src={photoUrl} style={{ width: photoSize, height: photoSize, borderRadius: photoSize / 2, objectFit: "cover", borderWidth: 3, borderColor: "#ffffff" }} />
                        </View>
                    ) : null}
                    {sideHeading("Contact Information")}
                    {contactLines(contact).map(line => (
                        <View key={line.icon} style={{ flexDirection: "row", alignItems: "center", marginBottom: s(9) }}>
                            <Icon name={line.icon} size={s(11)} color="#ffffff" />
                            <Text style={[side, { marginLeft: s(10), flex: 1 }]}>{line.text}</Text>
                        </View>
                    ))}
                    {contact.details.filter(detail => detail.label.trim() && detail.value.trim()).map(detail => (
                        <View key={detail.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: s(9) }}>
                            <Icon name="calendar" size={s(11)} color="#ffffff" />
                            <Text style={[side, { marginLeft: s(10), flex: 1 }]}>{detail.label.trim()}: {detail.value.trim()}</Text>
                        </View>
                    ))}
                    {sideSections.map(sideSection)}
                </View>
                <View style={{ flex: 1, paddingLeft: s(26), paddingRight: s(30) }}>
                    <View style={{ alignItems: "center", marginTop: s(10), marginBottom: s(16) }}>
                        <Text style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: s(32), color: accent, textTransform: "uppercase", lineHeight: 1.1 }}>{firstName}</Text>
                        {lastName ? <Text style={{ fontFamily: "Montserrat", fontWeight: 400, fontSize: s(32), color: accent, textTransform: "uppercase", lineHeight: 1.1 }}>{lastName}</Text> : null}
                        {contact.headline.trim() ? <Text style={{ fontFamily: "Open Sans", fontSize: s(11), color: MUTED, marginTop: s(4) }}>{contact.headline.trim()}</Text> : null}
                    </View>
                    {mainSections.map(mainSection)}
                </View>
            </View>
        </Page>
    )
}
