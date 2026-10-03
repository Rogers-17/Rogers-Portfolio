import { Document, Link, Page, Text, View, type Styles } from "@react-pdf/renderer"
import { Icon, contactLines } from "@/components/resume/pdf/shared"
import { DEFAULT_CLOSING, DEFAULT_SALUTATION, blockLines, defaultSubject, letterDate, type CoverStyle } from "@/lib/resume/cover-letter"
import { PROFESSIONAL_GOLD, TEMPLATE_INFO, type ResumeContact, type ResumeDesign, type TemplateKey } from "@/lib/resume/schema"

// A formal business letter, top to bottom: sender block, date, recipient block, salutation,
// bold subject line, body, closing and signature (bold name + contact lines).
//   style "formal": Times on a plain white page (the default)
//   style "resume": the linked resume's name header, accent colour and fonts

export type CoverLetterProps = {
    contact: ResumeContact
    template: TemplateKey
    design: ResumeDesign
    style: CoverStyle
    title: string
    senderName: string
    senderContact: string
    senderAddress: string
    recipient: string
    company: string
    jobTitle: string
    date: string
    salutation: string
    subject: string
    body: string
    closing: string
}

type Style = Styles[string]

const EMAIL = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
const LINK_BLUE = "#1155cc"

// A line of text with any email address as a blue mailto: link.
function LineWithLinks ({ line, style }: { line: string, style: Style }) {
    const parts = line.split(EMAIL)
    return (
        <Text style={style}>
            {parts.map((part, index) => (EMAIL.test(part) && index % 2 === 1
                ? <Link key={index} src={`mailto:${part}`} style={{ color: LINK_BLUE, textDecoration: "underline" }}>{part}</Link>
                : part))}
        </Text>
    )
}

export default function CoverLetterDocument (props: CoverLetterProps) {
    const { contact, template, design, style, title } = props
    const formal = style === "formal"

    // Each block falls back to the linked resume (or a sensible default) when left empty.
    const name = props.senderName.trim() || contact.fullName.trim()
    const contactRows = blockLines(props.senderContact).length ? blockLines(props.senderContact) : [contact.phone, contact.email].map(value => value.trim()).filter(Boolean)
    const addressRows = blockLines(props.senderAddress).length ? blockLines(props.senderAddress) : blockLines(contact.location)
    const recipientRows = blockLines(props.recipient).length ? blockLines(props.recipient) : blockLines(props.company)
    const salutation = props.salutation.trim() || DEFAULT_SALUTATION
    const subject = props.subject.trim() || defaultSubject(props.jobTitle)
    const closing = props.closing.trim() || DEFAULT_CLOSING
    const date = letterDate(props.date)
    const paragraphs = props.body.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean)

    const accent = design.accent ?? TEMPLATE_INFO[template].accents[0]
    const professional = template === "professional"
    const font = formal
        ? { regular: "Times-Roman", bold: "Times-Bold", weight: 400 as const }
        : { regular: professional ? "Carlito" : "Open Sans", bold: professional ? "Carlito" : "Open Sans", weight: 700 as const }
    const size = formal ? 12 : professional ? 11.5 : 10.5
    const text: Style = { fontFamily: font.regular, fontSize: size, color: formal ? "#000000" : "#222222", lineHeight: formal ? 1.2 : 1.45 }
    const bold: Style = formal ? { fontFamily: font.bold } : { fontWeight: font.weight }
    const gap = formal ? 14 : 12

    return (
        <Document title={title} author={name || undefined} creator="Rogers Portfolio" producer="Rogers Portfolio">
            <Page size={design.paper} style={{ paddingTop: formal ? 72 : 48, paddingBottom: formal ? 72 : 48, paddingHorizontal: formal ? 72 : 56, backgroundColor: "#ffffff" }}>
                {formal ? (
                    // Sender block, top left.
                    <View style={{ marginBottom: gap }}>
                        {name ? <Text style={text}>{name}</Text> : null}
                        {contactRows.map((line, index) => <LineWithLinks key={`c${index}`} line={line} style={text} />)}
                        {addressRows.map((line, index) => <Text key={`a${index}`} style={text}>{line}</Text>)}
                    </View>
                ) : (
                    <ResumeHeader contact={contact} name={name} accent={accent} professional={professional} text={text} addressRows={addressRows} contactRows={contactRows} />
                )}

                {date ? <Text style={[text, { marginBottom: gap }]}>{date}</Text> : null}

                {recipientRows.length ? (
                    <View style={{ marginBottom: gap }}>
                        {recipientRows.map((line, index) => <Text key={index} style={text}>{line}</Text>)}
                    </View>
                ) : null}

                <Text style={[text, { marginBottom: gap }]}>{salutation}</Text>
                {subject ? <Text style={[text, bold, { marginBottom: gap }]}>{subject}</Text> : null}

                {paragraphs.map((paragraph, index) => (
                    <Text key={index} style={[text, { marginBottom: gap }]}>{paragraph}</Text>
                ))}

                {/* Closing + signature never split across pages. */}
                <View wrap={false}>
                    <Text style={[text, { marginBottom: gap }]}>{closing}</Text>
                    {name ? <Text style={[text, bold]}>{name}</Text> : null}
                    {contactRows.map((line, index) => <LineWithLinks key={index} line={line} style={text} />)}
                </View>
            </Page>
        </Document>
    )
}

// "Match resume" header: the resume's name, headline, contact icons and rule.
function ResumeHeader ({ contact, name, accent, professional, text, contactRows, addressRows }: {
    contact: ResumeContact
    name: string
    accent: string
    professional: boolean
    text: Style
    contactRows: string[]
    addressRows: string[]
}) {
    const headingFont = professional ? "Carlito" : "Montserrat"
    // The letter's own contact lines win; the resume's links (LinkedIn, website) are added.
    const resumeLines = contactLines(contact).filter(line => line.icon === "linkedin" || line.icon === "globe")
    const lines = [
        ...contactRows.map(value => ({ icon: EMAIL.test(value) ? "mail" as const : "phone" as const, text: value })),
        ...addressRows.map(value => ({ icon: "pin" as const, text: value })),
        ...resumeLines,
    ]
    return (
        <View style={{ marginBottom: 22 }}>
            <Text style={{ fontFamily: headingFont, fontWeight: professional ? 700 : 800, fontSize: 24, color: accent, textTransform: "uppercase", letterSpacing: professional ? 0 : 1 }}>{name || "Your Name"}</Text>
            {contact.headline.trim() ? <Text style={{ fontFamily: text.fontFamily as string, fontStyle: professional ? "italic" : "normal", fontSize: 12, color: professional ? PROFESSIONAL_GOLD : "#444444", marginTop: 3 }}>{contact.headline.trim()}</Text> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, paddingBottom: 10 }}>
                {lines.map((line, index) => (
                    <View key={index} style={{ flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 3 }}>
                        <Icon name={line.icon} size={8.5} color={accent} />
                        <Text style={[text, { fontSize: 9, marginLeft: 5 }]}>{line.text}</Text>
                    </View>
                ))}
            </View>
            <View style={{ height: 1.2, backgroundColor: professional ? PROFESSIONAL_GOLD : accent }} />
        </View>
    )
}
