import "server-only"
import { SITE_HOST, absoluteUrl, site } from "@/lib/site"

// Reusable, email-safe HTML frame in the portfolio's look. Email clients ignore external CSS,
// most ignore <style>, web fonts and gradient text, and Outlook desktop ignores CSS gradients,
// so everything is table-based with inline styles and solid-colour fallbacks.

export const EMAIL = {
    surface: "#05000a",
    card: "#131320",
    border: "#211f2e", // ~6% white on the card, as a solid colour
    fg: "#e8e6f0",
    muted: "#8a8694",
    dim: "#5c586a",
    accent1: "#de0eff",
    accent2: "#751cff",
    accentSolid: "#9b16ff", // fallback where gradients aren't supported
    badge: "#12041a",
    font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const

const GRADIENT = `linear-gradient(65deg, ${EMAIL.accent1}, ${EMAIL.accent2})`

// Every value that didn't come from our own code must pass through here before entering HTML.
export function escapeHtml (value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

// Escapes, then keeps the visitor's line breaks.
export function escapeMultiline (value: string): string {
    return escapeHtml(value.trim()).replace(/\r\n|\r|\n/g, "<br>")
}

export type EmailCta = { label: string, href: string }

type LayoutInput = {
    // Hidden inbox preview line.
    preheader: string
    badge: string
    heading: string
    highlight?: string
    // Trusted HTML built by a template (its dynamic values already escaped).
    bodyHtml: string
    cta?: EmailCta
    // Trusted HTML shown under the button (e.g. secondary links).
    afterCtaHtml?: string
}

// Bulletproof pill button: the table cell carries a solid colour for Outlook and the
// gradient for everyone else. `href` must be a URL we built, never visitor input.
export function emailButton ({ label, href }: EmailCta): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
  <tr>
    <td align="center" bgcolor="${EMAIL.accentSolid}" style="border-radius:999px;background-color:${EMAIL.accentSolid};background-image:${GRADIENT};">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${EMAIL.font};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)} &rarr;</a>
    </td>
  </tr>
</table>`
}

export function renderEmailLayout (input: LayoutInput): string {
    const preheader = escapeHtml(input.preheader)
    const iconUrl = absoluteUrl("/icon")
    const siteUrl = absoluteUrl("/")

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(input.heading)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  @media (max-width: 620px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.surface};" bgcolor="${EMAIL.surface}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.surface}" style="background-color:${EMAIL.surface};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

        <!-- Header: monogram + wordmark -->
        <tr>
          <td class="px" style="padding:0 32px 24px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  <a href="${siteUrl}" target="_blank"><img src="${iconUrl}" width="40" height="40" alt="R" style="display:block;border:0;border-radius:10px;"></a>
                </td>
                <td style="vertical-align:middle;font-family:${EMAIL.font};font-size:24px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${EMAIL.accent1};">
                  <a href="${siteUrl}" target="_blank" style="color:${EMAIL.accent1};text-decoration:none;">Rogers</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:20px;" bgcolor="${EMAIL.card}">
            <!-- Accent bar -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td height="4" bgcolor="${EMAIL.accentSolid}" style="height:4px;line-height:4px;font-size:0;border-radius:20px 20px 0 0;background-color:${EMAIL.accentSolid};background-image:${GRADIENT};">&nbsp;</td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="px" style="padding:32px 32px 36px 32px;font-family:${EMAIL.font};color:${EMAIL.fg};">
                  <!-- Badge -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="${EMAIL.badge}" style="background-color:${EMAIL.badge};border:2px solid ${EMAIL.accent2};border-radius:10px 30px 30px 10px;padding:8px 16px;font-family:${EMAIL.font};font-size:14px;font-weight:500;color:${EMAIL.fg};">${escapeHtml(input.badge)}</td>
                    </tr>
                  </table>
                  <!-- Heading -->
                  <h1 class="h1" style="margin:20px 0 0 0;font-family:${EMAIL.font};font-size:28px;line-height:1.25;font-weight:700;color:#ffffff;">${escapeHtml(input.heading)}${input.highlight ? `<br><span style="color:${EMAIL.accent1};">${escapeHtml(input.highlight)}</span>` : ""}</h1>
                  ${input.bodyHtml}
                  ${input.cta ? `<div style="margin-top:32px;">${emailButton(input.cta)}</div>` : ""}
                  ${input.afterCtaHtml ?? ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="px" align="center" style="padding:24px 32px 0 32px;font-family:${EMAIL.font};font-size:12px;line-height:1.6;color:${EMAIL.dim};">
            Sent by <a href="${siteUrl}" target="_blank" style="color:${EMAIL.muted};text-decoration:underline;">${escapeHtml(SITE_HOST)}</a> &middot; ${escapeHtml(site.name)}, ${escapeHtml(site.city)}, Liberia
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
