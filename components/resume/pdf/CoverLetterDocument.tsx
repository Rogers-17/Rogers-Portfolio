import { Document, Page, Text, View } from "@react-pdf/renderer"
import { Icon, contactLines } from "@/components/resume/pdf/shared"
import { PROFESSIONAL_GOLD, TEMPLATE_INFO, type ResumeContact, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

// A cover letter in the same style as the linked resume: its name header, accent colour and
// fonts, then the date, recipient and the letter body.

type Props = {
    contact: ResumeContact
    template: TemplateKey
    design: ResumeDesign
    recipient: string
    company: string
    jobTitle: string
    date: string
    body: string
    title: string
}

export default function CoverLetterDocument ({ contact, template, design, recipient, company, jobTitle, date, body, title }: Props) {
    const accent = design.accent ?? TEMPLATE_INFO[template].accents[0]
    const professional = template === "professional"
    const bodyFont = professional ? "Carlito" : "Open Sans"
    const headingFont = professional ? "Carlito" : "Montserrat"
    const text = { fontFamily: bodyFont, fontSize: professional ? 11.5 : 10, color: "#222222", lineHeight: 1.55 }
    const lines = contactLines(contact)
    const paragraphs = body.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean)
    const recipientLines = [recipient.trim(), jobTitle.trim() && company.trim() ? `Re: ${jobTitle.trim()}, ${company.trim()}` : jobTitle.trim() || company.trim()].filter(Boolean)

    return (
        <Document title={title} author={contact.fullName || undefined} creator="Rogers Portfolio" producer="Rogers Portfolio">
            <Page size={design.paper} style={{ paddingTop: 48, paddingBottom: 48, paddingHorizontal: 56, backgroundColor: "#ffffff" }}>
                <Text style={{ fontFamily: headingFont, fontWeight: professional ? 700 : 800, fontSize: 24, color: accent, textTransform: "uppercase", letterSpacing: professional ? 0 : 1 }}>{contact.fullName || "Your Name"}</Text>
                {contact.headline.trim() ? <Text style={{ fontFamily: bodyFont, fontStyle: professional ? "italic" : "normal", fontSize: 12, color: professional ? PROFESSIONAL_GOLD : "#444444", marginTop: 3 }}>{contact.headline.trim()}</Text> : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, paddingBottom: 10 }}>
                    {lines.map(line => (
                        <View key={line.icon} style={{ flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 3 }}>
                            <Icon name={line.icon} size={8.5} color={accent} />
                            <Text style={[text, { fontSize: 9, marginLeft: 5 }]}>{line.text}</Text>
                        </View>
                    ))}
                </View>
                <View style={{ height: 1.2, backgroundColor: professional ? PROFESSIONAL_GOLD : accent, marginBottom: 24 }} />

                {date ? <Text style={[text, { marginBottom: 14 }]}>{date}</Text> : null}
                {recipientLines.map((line, index) => <Text key={index} style={[text, { fontWeight: index === 0 ? 700 : 400 }]}>{line}</Text>)}
                <View style={{ height: 18 }} />

                {paragraphs.map((paragraph, index) => (
                    <Text key={index} style={[text, { marginBottom: 10 }]}>{paragraph}</Text>
                ))}
            </Page>
        </Document>
    )
}
