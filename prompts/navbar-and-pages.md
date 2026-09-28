# Navbar rebuild + About Me, Gallery, Blog and placeholder pages

## Goal

1. **Rebuild the navbar** to match the two screenshots (`5.png` mobile menu, `6.png` desktop dropdown):
   - a styled dropdown submenu on desktop;
   - a full-screen mobile menu with icons and expandable submenus;
   - a **transparent bar that gets a dark background once the page scrolls**.
2. **Create pages** (static content in code, per your choices):
   - `/about`: About Me
   - `/gallery`: Gallery
   - `/blog`: a Blog placeholder ("coming soon")
   - `/learn/coding-courses` and `/start-a-project`: simple "coming soon" pages, so no nav link 404s.
3. Point every navbar and footer link at a real page. The logo stays **ROGERS**.

## Skills read

- `AGENTS.md`: Next.js + Tailwind (inline utilities); prompt → approval → implement; checks and manual test steps.
- Next 16 docs already applied in this repo: route groups (`app/(site)`), `next/link`, `next/image`, `usePathname`, and static `metadata` exports.
- No project skill directory exists.

## Existing code inspected

- `components/layout/Navbar.tsx`: a client component that's `sticky`, with `bg-primary` (not a real token, so it's transparent), a broken `hover:text-` class, an unused `Menu` import (the long-standing lint warning), and a white dropdown opened only on hover (no keyboard or touch support). The mobile menu is a `max-h` accordion without submenus, and it has a stray "Download App" button.
- `utils/data.tsx` → `NavbarMenu`: **it contains your uncommitted edits** (About → About Me, Gallery; Learn From Me → Coding Courses), with links to `/` and `/support`. This task rewrites that navbar data, so **your edits get folded in and committed** (same items, now with real links).
- `types/type.ts` → `NavbarMenuItems`.
- `components/ui/Menu.tsx`: an unused hamburger SVG, to be deleted.
- `components/layout/Footer.tsx`: its Navigate links point to `/` for Projects and About; they'll be fixed to `/projects` and `/about`.
- Reusable pieces: the gradient-border badge style, the section header pattern ("title / gradient subline"), `sections/Experience.tsx` + `sections/Testimonials.tsx` (from the DB), `sections/LogoTicker.tsx`, `sections/CallToAction.tsx`, and `assets/images/hero-image.png` (your portrait).
- `sections/Hero.tsx` uses `min-h-[calc(100vh-72px)]`, so the navbar height must stay at 72px.

## Decisions / assumptions

1. **Dropdown parents ("About", "Learn From Me") are buttons, not links**: they open their submenu. This fixes today's `/support` and `/learn` links, which lead nowhere.
2. **Routes:** About Me → `/about`, Gallery → `/gallery`, Coding Courses → `/learn/coding-courses`, Start A Project → `/start-a-project`, Blog → `/blog`.
3. **Active state** uses `usePathname`. A parent counts as active when any child matches (e.g. About is active on `/about` and `/gallery`), and Home only on `/` exactly.
4. **Desktop nav from `lg` (1200px)**, as today. Five items plus the CTA don't fit the 768px-wide container used at 768–1199, so those widths use the mobile menu.
5. **Icons:** Lucide via `react-icons/lu` (thin outline, matching the screenshot): `LuHouse`, `LuLayoutGrid`, `LuBookOpen`, `LuUser`, `LuGraduationCap`, `LuRocket`, and `LuChevronDown`/`LuChevronRight`/`LuX`/`LuMenu`.
6. **Static content** lives in `utils/content/about.ts` and `utils/content/gallery.ts`, commented so you can edit the text and swap images without touching the page code.
7. **Gallery images:** apart from your hero portrait, no photos exist in the repo. The gallery ships with the portrait plus **styled placeholder tiles**, each labelled with its caption. To add real photos, drop them into `public/gallery/` and set `src` in `gallery.ts`.
8. **About copy** is written from what's already on the site (the hero tagline, "11 years of excellence" from your Experience mockup, "Designed & built with passion in Nigeria" from the footer). No new biographical claims; please review and edit the wording in `about.ts`.
9. **The About page reuses the live Experience and Testimonials sections** (from Supabase) and the LogoTicker, so it stays in sync with the admin.
10. **The copyright line in the mobile menu** reads "© 2017–{current year} Rogers. All Rights Reserved.", with 2017 taken from the mockup.

## Files

### New

| File | Purpose |
|---|---|
| `components/layout/NavDropdown.tsx` | Desktop dropdown (client). |
| `components/layout/MobileMenu.tsx` | Full-screen mobile menu (client). |
| `components/ui/PageHeader.tsx` | Shared page header: badge, title, gradient subline, intro. |
| `components/ui/ComingSoon.tsx` | Shared "coming soon" block for placeholder pages. |
| `app/(site)/about/page.tsx` + `utils/content/about.ts` | About Me. |
| `app/(site)/gallery/page.tsx` + `components/gallery/GalleryGrid.tsx` (client) + `utils/content/gallery.ts` | Gallery. |
| `app/(site)/blog/page.tsx` | Blog placeholder. |
| `app/(site)/learn/coding-courses/page.tsx`, `app/(site)/start-a-project/page.tsx` | Placeholders. |

### Modified / removed

- `components/layout/Navbar.tsx`: rewritten.
- `utils/data.tsx` (`NavbarMenu` with icons and real routes) and `types/type.ts` (the nav types).
- `components/layout/Footer.tsx`: Navigate links fixed.
- **Delete** `components/ui/Menu.tsx` (unused).

## Visual interpretation & spec

### Navbar: shared

- A `sticky top-0 z-50` header, 72px tall (`h-18`), inside the existing site container.
- **At the top of the page:** a transparent background with no border.
- **Once scrolled past 8px:** `bg-[#0b0614]/85 backdrop-blur-xl border-b border-white/6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]`, with a 300ms transition on the background, border and shadow.
  - The scroll listener is passive, and the state is read once on mount so a reload mid-page is correct.
- Logo: the existing `<Logo />` (ROGERS gradient), linking to `/`.

### Navbar: desktop (≥ 1200px), per `6.png`

- **Centre items:** `uppercase text-[15px] font-bold tracking-wide`, 40px gap. Default white; hover and active use the accent colour (`text-accent-1`, as HOME in the screenshot). Parents show a small ▾ caret that rotates 180° when open.
- **Right side:** "START A PROJECT →" in gradient text, uppercase and bold, with the arrow nudging 4px right on hover.
- **Dropdown panel:**
  - Positioned 14px below the item, horizontally centred under it, with a **small caret/arrow at the top centre** (a rotated square in the panel colour with matching border).
  - `w-72 rounded-xl border border-white/10 bg-[#140b22] p-2.5 shadow-2xl`.
  - Items: `block rounded-lg px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-fg/90`. On hover, focus and when current: `bg-linear-65/srgb from-accent-1 to-accent-2 text-white` (the "ABOUT ME" look).
  - Opens with a 150ms fade + 4px slide-down.
- **Dropdown behaviour:**
  - Opens on hover with a 120ms close delay, so the mouse can travel from the item to the panel.
  - Also opens on click/tap and keyboard (Enter/Space; ↓ focuses the first item). Escape closes it and returns focus to the trigger.
  - Closes on an outside click or route change.
  - `aria-haspopup="true"`, `aria-expanded`, `aria-controls`; only one dropdown can be open at a time.

### Navbar: mobile & tablet (< 1200px), per `5.png`

- **Bar:** the logo on the left; on the right a "MENU" label (bold, uppercase) with a ☰ icon, opening a **full-screen panel**.
- **Panel:**
  - `fixed inset-0 z-60`, background `bg-[linear-gradient(180deg,#0b0714,#120a1f)]`.
  - Header row: the logo and a 28px ✕ close button.
  - Content scrolls if it's taller than the screen.
- **Items:**
  - Full-width rows `py-5 border-b border-white/6`, with the icon (22px) + label at `text-2xl font-medium`.
  - Default is muted grey (`text-muted`); **the active item is accent-coloured, icon and text** (as "Home").
  - "Start A Project" is the last row, with the rocket icon.
- **Submenus:**
  - "About" and "Learn from Me" rows are buttons with a chevron on the right: ⌄ for About, › for Learn, rotating to ⌄ when open.
  - Tapping expands the children inline beneath with a height transition. Children are `pl-12 py-2.5 text-lg text-white`, and the active child is accent-coloured.
  - The submenu containing the current page starts expanded.
- **Footer:** "© 2017–2026 Rogers. All Rights Reserved." centred, `text-xs text-dim`, at the bottom.
- **Behaviour:**
  - Locks body scroll, moves focus to the close button, traps Tab and closes on Escape; focus returns to the MENU button.
  - `inert` when closed; closes on link tap and route change.
  - 250ms fade + slide-in.

### Shared `PageHeader`

The same language as the homepage sections:

- badge (`inline-flex rounded-[10px_30px_30px_10px]` gradient border + emoji);
- `h1` `text-4xl md:text-6xl font-bold leading-tight`, with a gradient second line;
- intro `max-w-2xl text-lg text-muted`.

Spacing is `pt-10 md:pt-16`.

### `/about` (About Me)

1. **Intro (split layout):**
   - **Left (`lg:w-3/5`):** badge "About Me 👋🏽"; h1 "Hi, I'm Rogers." with gradient line "Designer. Developer. Builder."; 2–3 bio paragraphs (`text-lg leading-[1.85] text-muted`); buttons: "Start a project →" (gradient pill) and "View my work" (outline pill → `/projects`).
   - **Right (`lg:w-2/5`):**
     - the portrait (`hero-image.png`) in a `rounded-3xl` card with a gradient border (`p-[2px] bg-linear-65 from-accent-1 to-accent-2`) and a soft purple glow behind it;
     - two floating chips overlapping its corners: "11+ yrs experience" and "📍 Nigeria", as `bg-[#140b22]/90 border-white/10 rounded-full px-4 py-2 text-sm font-semibold`.
   - Stacked on mobile, text first.
2. **Highlights row:** 4 stat cards (`grid-cols-2 lg:grid-cols-4`, `rounded-2xl bg-white/4 border-white/6 p-6`): a big gradient value plus a muted label.
   - "11+" Years of experience
   - "Design + Code" End-to-end ownership
   - "AI-first" Modern product builds
   - "Global" Startups & financial institutions
3. **What I do:** a section header ("What I do / Services") + 3 cards (`md:grid-cols-3`), each with a gradient icon tile, title and description:
   - Product Design (UI/UX, design systems)
   - Full-Stack Development (Next.js, Supabase, APIs)
   - AI-powered Products (RAG, automation)
4. **Toolbox:** the heading "My toolbox" + the existing **LogoTicker**.
5. **Experience** (the existing DB-backed section).
6. **Testimonials** (the existing DB-backed section).
7. **CallToAction** (existing).

### `/gallery`

- **PageHeader:** badge "Gallery 📸", h1 "Moments & milestones." with gradient line "Behind the builds.", plus an intro.
- **Filter chips:** All / Work / Events / Life.
  - `rounded-full px-5 py-2 text-sm font-semibold` buttons; the active one is a gradient fill, the others `border-white/10 bg-white/4`.
  - `aria-pressed`; filtering happens client-side with a fade.
- **Masonry grid:**
  - CSS columns: 1 column below 560px, 2 from 560px, 3 at lg; `gap-5`.
  - Tiles are `rounded-2xl overflow-hidden border-white/6 break-inside-avoid` with varied aspect ratios (`aspect-[4/5]`, `[4/3]`, `[1/1]`) set per item.
  - A caption + category appear over a bottom gradient: always visible on touch devices, and on hover/focus on desktop.
  - Placeholder tiles use the site's gradient-grid placeholder with the caption centred.
- **Lightbox:** clicking an image tile opens a native `<dialog>` with the full image (`next/image`, contained), caption, ← → buttons (plus arrow keys) and ✕. Escape and backdrop click close it, and focus returns to the tile. Placeholder tiles don't open it.
- The CallToAction section follows.

### `/blog` (placeholder)

- **PageHeader:** badge "Blog ✍🏽", h1 "Notes from the build." with gradient line "Coming soon.", and the intro "Design, code and product lessons from shipping real products."
- **ComingSoon card:** `rounded-3xl border-white/6 bg-card p-8 md:p-12` with a glow.
  - A book icon tile, the heading "First posts are on the way", and body text.
  - Topic chips: Design Systems · Next.js · Supabase · AI Products · Freelancing.
  - Buttons: "See my work" → `/projects` and "Start a project" → `/start-a-project`.
- **3 preview skeleton cards** (`md:grid-cols-3`, dimmed, a pulsing shimmer, a "Coming soon" label), `aria-hidden`, hinting at the future layout.

### `/learn/coding-courses` and `/start-a-project`

- `PageHeader` plus the ComingSoon card:
  - **Courses:** badge "Learn From Me 🎓", "Coding courses." / "Launching soon.".
  - **Start a project:** badge "Start A Project 🚀", "Let's build something." / "Booking opens soon.", and a note to reach out via the socials in the footer. There's no form yet (no backend in this step).
- Both are followed by the CallToAction section (and on `/start-a-project`, the CTA's own "Let's Work" link points to the same page, which is harmless).

### Metadata

Each page exports `metadata` (title "About | Rogers Portfolio", etc., plus a description).

## Security requirements

- Static content only, rendered as React text; no `dangerouslySetInnerHTML`.
- External links (if any) use `rel="noopener noreferrer"`.
- No new dependencies, and no new data sources or API routes.

## Acceptance criteria

- **Desktop ≥ 1200px:** hovering or clicking "About" shows the dark dropdown with its arrow, and items get the gradient highlight on hover or when current. Keyboard works (Tab to About, Enter opens, ↓ into the items, Escape closes).
- **< 1200px:**
  - "MENU ☰" opens the full-screen panel matching `5.png`; the About and Learn from Me submenus expand inline.
  - The active page is highlighted, and the panel closes on link tap and on Escape.
  - The page behind doesn't scroll while it's open.
- **Scroll:** the navbar is transparent at the top of every page and gets the dark blurred background after scrolling, with no layout jump.
- `/about`, `/gallery`, `/blog`, `/learn/coding-courses` and `/start-a-project` render at 375, 768, 1024 and 1440px without horizontal scroll. The gallery filter and lightbox work, and About shows the live Experience and Testimonials.
- No nav or footer link points to `/` by mistake or to a missing page.
- `npm run typecheck`, `npm run lint` (**the `Menu` warning disappears**) and `npm run build` pass.
- The headless screenshot pass at 4 widths is reviewed (navbar top/scrolled/open states and each new page).

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Plus headless-Chrome screenshots with an overflow check (as in Phase 3) for the navbar states and each new page.

## Manual test steps (to share after implementation)

1. `npm run dev` and open http://localhost:3000 at desktop width.
   - The navbar is transparent at the top; scroll down and it gets the dark blurred background; scroll back up and it's transparent again.
   - Hover **About** and the dropdown appears with the arrow; hover About Me and it turns gradient. Click **Gallery** and you're on `/gallery`, with About highlighted in the navbar.
   - Keyboard: Tab to About, press Enter, then ↓ to move into the items, Escape to close.
2. In DevTools device mode, choose iPhone 14:
   - Tap **MENU** to open the full-screen menu; Home is highlighted.
   - Tap **About** and it expands to About Me and Gallery; tap **Learn from Me** and Coding Courses appears.
   - Tap a link: the menu closes and the page changes. Open it again and press Escape (or tap ✕).
3. Visit `/about`, `/gallery` (try the filters and click the portrait tile to open the lightbox, then use ← → and Escape), `/blog`, `/learn/coding-courses` and `/start-a-project` at phone, tablet and desktop widths.
4. Footer: the Projects and About links go to `/projects` and `/about`.
