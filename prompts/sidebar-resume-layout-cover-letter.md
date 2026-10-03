# Collapsible sidebar, roomier resume editor, formal cover letter

## Goal

1. **Sidebar.** On desktop, add a button that collapses the dashboard sidebar to icons only, and expands it again. The content gets the freed space. The choice is remembered.
2. **Resume editor.** On desktop, tidy the layout so the editor, the form and the live preview share the space smoothly. Fields shouldn't be squeezed into two narrow columns, and the panels should shrink gracefully instead of crowding each other.
3. **Cover letter.** Rebuild the cover letter to match Rogers's template (*A1 Technical Institute Application Letter.pdf*): a formal business letter with these parts, top to bottom:
   - the sender block (name, phone numbers, email, address);
   - the date;
   - the recipient block (company, address lines, department);
   - the salutation;
   - a bold subject line ("RE: Application for … Position");
   - the body paragraphs;
   - the closing ("Sincerely,");
   - the signature (bold name, phone numbers, email).

   It uses a Times serif font on a white page, with no coloured header.

## Skills read

- `AGENTS.md`: the workflow, the checks and the commit format.
- Next 16 docs:
  - `cookies` in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` (it's async, `await cookies()`), used to render the sidebar in its saved state on the first paint;
  - `layout.md`.
- The `anthropic-skills:docs` and `pptx` skills are not relevant: this is app code, not a document to produce.

## Existing code inspected

**Sidebar**
- `components/admin/AdminShell.tsx` has three versions of the navigation:
  - ≥ lg (1200 px): a full `w-60` sidebar;
  - md to lg: a `w-16` icon rail;
  - below md: a top bar with a drawer.
- `<main>` uses `lg:ml-60`.
- `WIDE_ROUTES` removes the max width for the resume and cover letter editors.
- `app/admin/(dashboard)/layout.tsx` renders `AdminShell`.

**Resume editor**
- `components/resume/ResumeEditor.tsx` switches to a three-column grid, `17rem | 1fr | 0.95fr`, when the **viewport** is at least 1440 px (`matchMedia`). Below that it uses two columns and a "Preview" overlay.
- With the 240 px sidebar, at 1440 px the form and preview columns end up only about 400 px wide each.
- `ContactForm.tsx`, `SectionEditor.tsx`, `DesignForm.tsx` and the `md:col-span-2` helpers in `controls.tsx` and `BulletsEditor.tsx` all pick their two-column layout from the **viewport** (`md:` is 768 px). So inside a 400 px column the fields still split into two cramped columns. This is the main reason it looks crowded.
- `EditorPanel.tsx` is the left section list (sticky).
- `PdfPreview.tsx` is the iframe PDF viewer.

**Cover letter**
- `components/resume/pdf/CoverLetterDocument.tsx` copies the linked resume's style: a coloured name header, contact icons and a rule, then the date (`en-GB`, "24 September 2026"), the recipient, "Re: job, company" and the body.
- `components/resume/CoverLetterEditor.tsx` has a single-line `recipient` field. The body textarea holds the greeting and sign-off too, and the grid uses `md:grid-cols-2`.
- `lib/resume/cover-letter.ts` (`coverLetterInputSchema`), `lib/resume/queries.ts` (`letterSchema`, `LETTER_COLUMNS`), and the `cover_letters` table in `20261002000000_resume_builder.sql`.
- `lib/ai/prompts.ts` → `coverLetterMessages`: the AI currently writes the greeting and the sign-off into the body.
- The resume contact holds `fullName`, `phone`, `email`, `location` and extra `details`.

## Decisions and assumptions

### 1. Sidebar

- **Where it applies.** From lg (1200 px) up, a "Collapse sidebar" button sits at the bottom of the sidebar, above the account card. It's an icon button showing `FiChevronsLeft`, with the label "Collapse" next to it.
- **Collapsed.** The sidebar becomes the existing `w-16` icon rail, which is already designed:
  - icons only;
  - tooltips via `title`;
  - badges as dots with counts;
  - "View site" and "Sign out" as icons.
  
  The expand button (`FiChevronsRight`) sits at the bottom of the rail.
- **Content.** `<main>` moves from `lg:ml-60` to `lg:ml-16`, with a 200 ms ease transition on the width and margin.
- **Remembering the choice.** It's saved in an `admin_sidebar=collapsed` cookie (one year, `SameSite=Lax`, path `/admin`). The dashboard layout reads the cookie on the server, so the page loads in the right state with no jump or flash. There's also a keyboard shortcut, `Ctrl/⌘ + B`, matching most editors.
- **Tablet and phone.** md to lg keeps the rail as it is now, and phones keep the drawer.

### 2. Resume editor layout (desktop)

- **Columns follow the available space, not the screen.** A `ResizeObserver` on the editor container decides the layout:

| Editor container width | Layout |
| --- | --- |
| 1120 px or more | Three columns: `15rem` section list, then `minmax(26rem, 1fr)` form, then `minmax(22rem, 0.9fr)` preview |
| 760 to 1120 px | Two columns: list and form, with the "Preview" button opening the overlay as today |
| Under 760 px | One column (as today on small screens) |

  - With the sidebar collapsed, a 1280 px laptop already gets the three-column view.
  - With it expanded, three columns start at about 1400 px.
- **Form fields use container queries** instead of viewport breakpoints. The form `<section>` gets `@container`, and the field grids use `@xl:grid-cols-2` (36 rem, 576 px). The `col-span-2` helpers become `@xl:col-span-2`. A narrow column therefore shows full-width fields, and a roomy one shows two per row.

  Places that change:
  - `ContactForm` and its detail rows: `grid-cols-1` and `@md:grid-cols-[1fr_2fr_auto]`;
  - the field grids and item rows in `SectionEditor`;
  - the template grid in `DesignForm`: two, then `@xl:` four columns, and its three-column option row becomes `@2xl:`;
  - `RField` (`wide`), `RTextArea`, `RCheckbox` and `BulletsEditor`.
- **Spacing and sizing.**
  - The form card padding becomes `p-5 @3xl:p-7`.
  - Section headings get consistent `mb-5` spacing.
  - The section list shrinks to `15rem` and stays sticky; long section names truncate cleanly.
  - The preview column is sticky at `top-6` and `h-[calc(100dvh-3rem)]`, and the PDF fills it.
  - The top bar wraps cleanly: the title and status on the left, the buttons on the right, with the buttons collapsing to icons below 640 px of container width.
  - Gaps are `gap-5` between columns.
- **No change to editing behaviour, data or the PDF templates.**

### 3. Cover letter (matching the attached template)

**New letter fields**, all optional except the body:

| Field | What it holds | Default |
| --- | --- | --- |
| `sender_name` | Text, up to 120 characters | Linked resume's `fullName` |
| `sender_contact` | Multi-line, up to 300 characters. For example "0779268242 / 0881313873" on one line and the email on the next | Resume phone, then email |
| `sender_address` | Multi-line, up to 300 characters | Resume `location` |
| `recipient` | Becomes the multi-line recipient **block**, up to 600 characters (existing values still work as the first line) | The company name |
| `salutation` | Up to 120 characters | "Dear Hiring Manager," |
| `subject` | Up to 200 characters | "RE: Application for {Job title} Position" |
| `closing` | Up to 60 characters | "Sincerely," |
| `style` | `formal` or `resume` | `formal` |

- **Prefilling.**
  - Empty sender fields fill in from the linked resume when it's chosen, through an "Use resume details" button and automatically when the fields are empty. After that they can be edited per letter.
  - The subject and salutation prefill when they're empty. The subject updates live while it still matches the auto-generated text.
- **The PDF** (`style: formal`, the default), matching the template:
  - **Page:** A4 or Letter, taken from the linked resume's paper size (A4 by default). 72 pt (1 inch) margins.
  - **Type:** the built-in `Times-Roman` and `Times-Bold` fonts at 12 pt with a 1.2 line height. Black text, left-aligned, not justified.
  - **Blocks**, separated by about one blank line of 12 to 14 pt:
    1. the sender block (name, contact lines, address lines);
    2. the date, in US format ("September 24, 2026");
    3. the recipient block;
    4. the salutation;
    5. the **bold** subject;
    6. the body paragraphs, 12 pt apart;
    7. the closing;
    8. the signature, with the **bold** name followed by the contact lines (no address).
  - **Email** addresses are blue (`#1155cc`), underlined `mailto:` links, in both the sender block and the signature.
  - **Long letters** flow onto a second page naturally. The signature block never splits across pages (`wrap={false}`).
- **"Match resume" style.** The current design is kept as the second choice, rendered with the same new structure (salutation, subject, closing and signature) under the resume-style header.
- **Editor.** The form is regrouped to follow the letter top to bottom, using the same container-query fields:
  1. **From:** name, contact lines, address, and the "Use resume details" button;
  2. **Date**;
  3. **To:** company, job title, and the recipient block textarea;
  4. **Opening:** salutation and subject;
  5. **Body**, with the AI writer;
  6. **Sign-off:** closing;
  7. **Style:** Formal or Match resume, as a two-option segmented control.
- **Editor layout.** It uses the same container-width layout as the resume editor: the form on the left and the sticky preview on the right from 1000 px of container width; otherwise stacked, with the preview below.
- **AI drafts.** The AI writes **only the body paragraphs**. The prompt changes to "no greeting, no sign-off, no name; those are separate fields". If an older body starts with "Dear …" or ends with "Sincerely, Name", that's left alone (no automatic stripping), but new drafts won't include it.
- **No personal data is committed.** No phone numbers, address or email from the attached letter go into the code, seeds or prompts. They come from Rogers's own resume data or typing.

## Files likely to change

- `supabase/migrations/20261007000000_cover_letter_fields.sql`:
  - adds `sender_name`, `sender_contact`, `sender_address`, `salutation`, `subject`, `closing` and `style` (all with length checks; `style` defaults to `'formal'`);
  - widens `recipient` to 600 characters.

  It's safe to re-run (`add column if not exists`, constraints dropped and re-added).
- `lib/resume/cover-letter.ts`: the schema gets the new fields, plus `defaultSubject(jobTitle)`.
- `lib/resume/queries.ts`: `letterSchema` and `LETTER_COLUMNS`.
- `app/api/admin/cover-letters/route.ts` and `[id]/route.ts`: no logic changes expected, since they use the schema. To be verified.
- `components/resume/pdf/CoverLetterDocument.tsx`: rewritten with the formal and "match resume" layouts.
- `components/resume/CoverLetterEditor.tsx`: regrouped form, prefilling and the new layout.
- `lib/ai/prompts.ts`: `coverLetterMessages` asks for the body only.
- `components/admin/AdminShell.tsx`: the collapse state, toggle, shortcut and transitions.
- `app/admin/(dashboard)/layout.tsx`: reads the `admin_sidebar` cookie and passes `initialCollapsed`.
- `components/resume/ResumeEditor.tsx`: container-width layout instead of `matchMedia(1440)`.
- `components/resume/controls.tsx`, `ContactForm.tsx`, `SectionEditor.tsx`, `DesignForm.tsx`, `BulletsEditor.tsx` and `EditorPanel.tsx`: container queries and spacing.
- A shared `components/resume/useContainerWidth.ts` hook.

## Implementation requirements

**Sidebar**
- Use one `collapsed` state in `AdminShell`, initialised from the server cookie.
- Toggling it:
  - writes `document.cookie` (`admin_sidebar=collapsed`, or deletes the cookie with `max-age=0`);
  - updates the state;
  - doesn't call `router.refresh()` (none is needed).
- From lg up, render either the full sidebar or the rail (the existing markup is reused through `NavLinks`).
- The toggle button:
  - has `aria-expanded`;
  - has `aria-label` set to "Collapse sidebar" or "Expand sidebar";
  - is a 40 px target;
  - shows the visible text "Collapse" when expanded and only an icon when collapsed.
- The `Ctrl/⌘+B` shortcut is ignored while typing in inputs, textareas or contenteditable elements, so the Tiptap editor's bold shortcut keeps working.
- `<main>`: `lg:ml-60` or `lg:ml-16` depending on `collapsed`, with `transition-[margin] duration-200`. The sidebar `aside` animates its width.
- Wide editors keep `max-w-none`. Other pages keep `max-w-6xl`, centred in the bigger space.

**Resume editor**
- A `useContainerWidth(ref)` hook built on `ResizeObserver`. It returns 0 until measured, and the editor treats 0 as "two columns", the same as the server render, so there's no hydration mismatch.
- The `wide` flag becomes `width >= 1120`.
- The "Preview" button and the overlay are kept for narrower layouts.
- The form `section` gets `@container`, and every field grid uses container variants. No `md:` or `sm:` grid splits remain inside the form panels.
- Verify each panel at container widths of 420, 560, 760 and 900 px:
  - no field narrower than about 200 px;
  - labels never wrap mid-word;
  - action buttons never overflow.

**Cover letter**
- The input schema gets the new fields (trimmed; null when empty), with `style: z.enum(["formal", "resume"]).default("formal")`.
- The PDF:
  - `Times-Roman` and `Times-Bold` (built into react-pdf; no font files);
  - multi-line fields split on `\n`, with empty lines removed;
  - email detection with a simple regex on the contact lines, so they render as blue underlined links (`Link src="mailto:..."`);
  - the date formatted with `en-US` (`{ month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }`).
- Editor prefilling never overwrites text Rogers has typed. It only fills empty fields, or runs when "Use resume details" is clicked.
- The AI prompt: "Write only the body paragraphs: no greeting/salutation, no subject line, no closing, no name or contact details."

## Security requirements

- **Cookie:** `admin_sidebar` holds only a UI preference. It's read as an exact match (`=== "collapsed"`), so any other value means expanded. It isn't `HttpOnly` because the client writes it, and it's never used for anything else.
- **Validation:** all new letter fields are validated by Zod (lengths, and an enum for the style) and checked in the database. The API routes keep `requireAdminApi` and the same-origin check.
- **No `dangerouslySetInnerHTML`:** the PDF text is rendered as react-pdf `Text` nodes, and the email links only use the `mailto:` prefix plus a matched address.
- **No personal data** from the attached letter goes into the repository.

## Acceptance criteria

1. On a screen of 1200 px or wider, "Collapse" turns the sidebar into the icon rail and the content widens smoothly. "Expand" restores it. After a reload, the state is kept with no flash, and `Ctrl/⌘+B` toggles it (except while typing).
2. Tablet and phone navigation are unchanged.
3. Resume editor:
   - At 1440 px with the sidebar collapsed, and at 1600 px or wider expanded, it shows three columns.
   - The form fields split into two per row only when the form column is at least 576 px wide; otherwise they're full width.
   - Nothing overlaps or overflows at 1200, 1280, 1366, 1440 and 1920 px, in either sidebar state.
4. The cover letter PDF matches the template's structure, order, fonts, bold subject and name, blue email links, and spacing.
5. Existing letters still open and render. Their single-line recipient shows as the recipient block, and their missing fields fall back to defaults.
6. New AI drafts contain only body paragraphs.
7. `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Render the formal letter PDF with sample (non-personal) data to PNG in the scratchpad, using the existing `pdf2png` script, and compare it with the template.
- A static render of the editor panels at the four container widths, through headless screenshots of the components where possible. Admin login isn't available to me, so the full editor is checked by Rogers.

## Manual test steps (after implementation)

1. **Run the migration.** In the Supabase SQL Editor, run `supabase/migrations/20261007000000_cover_letter_fields.sql`.
2. **Restart the app.** Restart `npm run dev`.
3. **Sidebar.** Open any dashboard page at desktop width.
   - Click **Collapse**: the sidebar should shrink to icons and the content should widen.
   - Reload: it should stay collapsed.
   - Press `Ctrl+B`: it should expand.
   - Hover the icons: the tooltips should show the page names.
4. **Resume editor.** Open a resume in **Resumes**.
   - With the sidebar collapsed on a laptop-sized window, you should see the section list, the form and the live preview side by side.
   - Resize the window: the fields should go from two per row to one, and the preview should drop to the "Preview" button when there's no room.
5. **Cover letter details.** Open a cover letter and link your resume.
   - Click **Use resume details**: the sender name, contacts and address should fill in.
   - Edit the contact lines to "0779268242 / 0881313873", then your email on the next line.
   - Set the recipient block to the company, its address and the department, with one item per line.
   - Set the job title to "IT Officer": the subject should read "RE: Application for IT Officer Position".
6. **Cover letter preview.** The preview should match your template:
   - Times font;
   - your details at the top left;
   - the date as "October 2, 2026";
   - the recipient block, "Dear Hiring Manager,", the bold RE line, the body, and "Sincerely,";
   - your bold name with your contacts;
   - blue email links.
7. **Style switch.** Switch Style to **Match resume**: the letter should use your resume's header style, with the same structure.
8. **AI draft.** Click **Generate draft**: the body should have no "Dear…" and no "Sincerely, name".
9. **API check.** Without a session, this should return 401:

```bash
curl -i -X POST http://localhost:3000/api/admin/cover-letters/00000000-0000-0000-0000-000000000000 \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Hello","style":"formal"}'
```
