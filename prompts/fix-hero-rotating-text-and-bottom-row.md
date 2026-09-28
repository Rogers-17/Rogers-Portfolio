# Fix Hero: mobile layout shift from rotating text + desktop bottom-row alignment

## Goal

1. **Stop layout shift on mobile.** On mobile the typing word in the hero title ("Magic", "Websites", "Designs", "Systems", "Web Apps") sometimes fits on the "Let's create" line and sometimes wraps, and it collapses to nothing while it's being deleted. Each time, the `<h1>` changes height, so the avatar, the bottom row and the rest of the page jump up and down. The title must keep a fixed height while the word animates.
2. **Align the hero bottom row on tablet/desktop (md+).** Match the design mockups: the description and "Corporate Profile" link are left-aligned in a column on the left, and the "LET'S WORK" CTA is on the right, both on one row across the bottom of the avatar.

## Skills read

- `AGENTS.md` (workflow, stack, checks)
- No project skill directory exists; none were named by the user.

## Existing code inspected

- `sections/Hero.tsx`: title markup (`Let's create&nbsp;<span …><TypeAnimation …/></span><br />together`) and the bottom row (`motion.div` wrapper → left column `div` with `<p>` and `<a>` profile link, plus the CTA `<a>`)
- `app/globals.css`: breakpoints `sm 375 / md 768 / lg 1200`
- Design mockups in `assets/design/`:
  - `iPhone-14-Pro-*.png`: title on 3 lines (`Let's create` / **rotating word** / `together`)
  - `iPad-Air-5-*.png` and `Macbook-Air-*.png`: title on 2 lines (`Let's create <word>` / `together`). The bottom row has the description + profile link left-aligned on the left (about 30% of the container width) and the CTA pill on the right, both vertically centred on the same row and overlapping the bottom of the avatar.

## Root cause (item 1)

- At 375px the title is 36px. `Let's create Magic` roughly fits on one line, but `Let's create Web Apps` does not, so the title flips between 2 and 3 lines.
- While the word is deleted and retyped, the inline span shrinks to just the cursor, which also changes how the line wraps.
- Every change in title height pushes all content below it.

## Decisions / assumptions

1. **Mobile (< md):** the rotating-word wrapper becomes `block` with a reserved height of one title line (`min-h-[1.02em]`, matching `leading-[1.02]`). The title is then always 3 lines, which matches the iPhone mockup exactly. The `<br />` before "together" is hidden below md, because a `<br>` straight after a block element would add an empty line.
2. **md and up:** the wrapper stays `inline-block` and the `<br />` shows, giving 2 lines as in the iPad and MacBook mockups. At md+ the longest word ("Web Apps") fits on the first line at every width (the title is capped at `max-w-[960px]`), so there is no vertical shift. Horizontal re-centring of "Let's create" while the word types is how the design already behaves and stays unchanged.
3. **Bottom row at md+:** `flex-row flex-nowrap justify-between items-center`. The left column becomes `items-start text-left` with `md:max-w-[320px]` (about 30% of the container, as in the mockups). The CTA keeps `md:w-auto` and gets `shrink-0`. The existing `md:-mt-[60px]` overlap onto the avatar stays.
4. **Mobile bottom row is unchanged**: stacked and centred, with description → profile link → full-width CTA.
   - *Flag:* the iPhone mockup puts the CTA **above** the description. It isn't in this request, so I'm not changing it; tell me if you want it.
5. **Out of scope:** the CTA's colour (`bg-purple-500` vs the gradient in the mockups), the floating avatar stickers in the mockups, and the Navbar.

## Files likely to change

- `sections/Hero.tsx` only.

## Implementation requirements

### Title (`motion.h1`)

- Rotating-word wrapper `<span>`: replace `inline-block` with `block min-h-[1.02em] md:inline-block md:min-h-0`, keeping the gradient-text utilities.
- `&nbsp;` after "create": keep. It is harmless on mobile because the word sits on its own line.
- `<br />` before "together" → `<br className="hidden md:inline" />`.
- Do not change the `TypeAnimation` props or `rotatingWords`.

### Bottom row (`motion.div` wrapper)

- Add `md:flex-nowrap md:justify-between`. `items-center` is already present. Keep all existing spacing and z-index utilities.
- Left column `div`: add `md:max-w-[320px] md:items-start md:text-left`. Mobile stays `items-center text-center`.
- CTA `<a>`: add `shrink-0`. Everything else is unchanged.

## Visual interpretation / pixel expectations

- **Mobile (375–767px):** title is always 3 centred lines. The rotating word sits on line 2 in the pink→purple gradient. The line keeps its height even while the word is fully deleted (only the cursor showing). The avatar and everything below it **must not move** during the animation.
- **Tablet (768–1199px):** title is 2 lines. The bottom row is one line: text block on the left (left-aligned, 320px max width, description above the profile link, 16px gap), CTA pill on the right edge, both vertically centred on each other, overlapping the bottom of the avatar by 60px.
- **Desktop (≥ 1200px):** same as tablet inside the 1200px container. The text block's left edge and the CTA's right edge line up with the row's 32px side padding.
- Typography, colours, font sizes and spacing are otherwise unchanged.

## Security requirements

- No new dependencies, no `dangerouslySetInnerHTML`. The existing `rel="noopener"` on the `target="_blank"` link stays.

## Acceptance criteria

- On a 375px viewport, the avatar's top edge stays in the same position through a full cycle of all 5 words.
- On mobile the title is always 3 lines; at md+ it is always 2 lines.
- At md+ the description and profile link are left-aligned on the left and the CTA is on the right, on the same row.
- Mobile bottom-row layout is unchanged.
- `npm run typecheck`, `npm run lint` and `npm run build` pass (no new warnings).

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

## Manual test steps (to share after implementation)

1. `npm run dev` and open http://localhost:3000.
2. DevTools → device mode → **iPhone SE / 375px**. Watch the hero for one full word cycle (about 15s). The title stays 3 lines and the avatar and content below do not jump. Check the same at 414px and 600px.
3. Switch to **768px** (iPad Mini). The title is 2 lines. Below the avatar, the description and "Corporate Profile" are left-aligned on the left and "LET'S WORK" is on the right, on the same row.
4. Switch to **1440px** and confirm the same row alignment inside the centred 1200px container.
5. Resize slowly across 767 → 768px and confirm it switches cleanly between the stacked (mobile) and row (desktop) layouts.
