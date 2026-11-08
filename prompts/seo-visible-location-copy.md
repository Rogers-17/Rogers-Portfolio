# SEO follow-up: say "Liberia" in visible copy, and make profiles easy to add

## Goal

Google weighs text that visitors can read more than metadata. The visible copy never says where Mohammed N. Rogers is based, so searches like "full stack developer Liberia" have little to match on. Add the location to the hard-coded visible copy, keeping the owner's voice and claims, and change nothing else in the design.

## Skills read

- `AGENTS.md`
- No project skills exist.
- No new Next.js APIs are involved.

## Existing code inspected

- `sections/Hero.tsx`: the home hero paragraph reads "Full-Stack Designer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions." It doesn't mention a location.
- `components/layout/Footer.tsx`: the tagline reads "Full-Stack Developer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and institutions." This is on every page. The bottom line already says "built … in Liberia".
- `lib/site.ts`: `site.socials` holds only GitHub, and the footer and Person `sameAs` read from it.
- The About page intro, early-life and journey text come from Supabase (`about_page`) and are edited in Admin › About. They are **not** changed in code.

## Decisions

1. **Use "Liberia" only, not "Monrovia".** The city hasn't been confirmed, and we don't invent facts.
2. **Hero paragraph** becomes: "Liberia-based Full-Stack Developer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions."
   - "Designer" becomes "Developer" to match the footer, the site title and the target searches.
   - The rest of the sentence and its claims stay word for word.
3. **Footer tagline** becomes: "Liberia-based Full-Stack Developer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and institutions."
4. **No LinkedIn or X URLs are added** until the owner provides them. Adding one later is a single entry in `site.socials` plus an icon mapping in the footer.
5. **The About page DB copy** is the owner's to edit. The final report suggests adding a sentence there.
6. **Same classes and layout.** The hero paragraph is a little longer, so check that it still wraps cleanly in the `md:max-w-[320px]` column.

## Approved revisions from the owner (these override decisions 1–4)

- **City confirmed: Monrovia.** The copy says "based in Monrovia, Liberia":
  - Hero: "Full-Stack Developer based in Monrovia, Liberia, harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions."
  - Footer: the same sentence, ending "for startups and institutions."
- **Person JSON-LD** `address` gains `addressLocality: "Monrovia"`.
- **The About meta description** says "based in Monrovia, Liberia". The home description stays as the brief's text.
- **Verified profiles to add** to `site.socials`, which drives the footer and Person `sameAs`:
  - LinkedIn: `https://www.linkedin.com/in/mohammed-rogers-791589388`
  - X: `https://x.com/Ayosavage361142`
  - The footer gets the LinkedIn and X icons back, with the same markup as GitHub.
  - The root metadata adds `twitter.creator: "@Ayosavage361142"`.

## Files likely to change

- `sections/Hero.tsx`: one text node.
- `components/layout/Footer.tsx`: one text node.

## Implementation requirements

- Text only. No class, structure or animation changes.

## Security requirements

- None beyond the existing ones: no new data, inputs or dependencies.

## Acceptance criteria

- The home hero paragraph and the footer tagline both contain "Liberia-based Full-Stack Developer".
- No other visible changes. The hero bottom row still aligns on desktop, and there's no layout shift on mobile.
- `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Manual test steps

1. Run `npm run dev`. Open `/`: the paragraph under the portrait reads "Liberia-based Full-Stack Developer …".
2. Scroll to the footer on any page: the tagline reads the same way.
3. Resize to 375 px and 1280 px. The hero bottom row keeps its alignment and the "LET'S WORK" button doesn't wrap.
