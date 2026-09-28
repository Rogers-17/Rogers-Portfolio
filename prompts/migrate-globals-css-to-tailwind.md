# Migrate `app/globals.css` plain CSS to inline Tailwind classes

## Goal

`app/globals.css` is 400+ lines of hand-written CSS. Remove every plain CSS rule from it and put the same styling **inline in each component's `className`** as Tailwind utilities. After the change, `globals.css` is a short file (about 30 lines) that holds only `@import "tailwindcss"` and a small `@theme` block of design tokens. The rendered site must look identical at all breakpoints, except for the one intentional fix listed under Decisions (hero background image).

## Skills read

- `AGENTS.md` (workflow, stack, checks)
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` (Next 16 Tailwind setup: `@tailwindcss/postcss` + `@import "tailwindcss"` in global CSS, which is the current setup)
- No project skill directory exists; none were named by the user.

## Existing code inspected

- `app/globals.css`: `:root` vars, `@theme` breakpoints, `@theme inline` font, body/html base styles, `.main`, `.hero-*`, `.grad-*`, `.btn*`, keyframes, and a lot of dead rules
- `app/layout.tsx`: loads the local Atyp Display font as `--font-atydisplay`, imports `globals.css`
- `sections/Hero.tsx`: all `hero-*` classes, `main`, `hero-bg`, `grad-badge`, `grad-text`, and an undefined `btn-text` class
- `sections/CallToAction.tsx`: `btn btn-primary btn-lg`, `btn btn-outline btn-lg`, `grad-badge`, `grad-text`, `text-muted`, `main`
- `sections/Project.tsx`, `sections/Experience.tsx`, `sections/Testimonials.tsx`, `components/layout/Footer.tsx`, `components/layout/Navbar.tsx`, `components/ui/Logo.tsx`: `main`, `grad-text`, `grad-badge`, `text-muted`
- `package.json`: Tailwind 4.3.2; **no `typecheck` script**
- `public/img/hero-bg.png` exists

### Class usage audit

| Class | Used in |
|---|---|
| `main` | Navbar, Footer, Hero, Project, Experience, Testimonials, CallToAction |
| `text-muted` | Navbar, Footer, Project, Experience, Testimonials, CallToAction |
| `grad-text` | Logo, Navbar, Footer, Hero, Project, Experience, Testimonials, CallToAction |
| `grad-badge` | Hero, Project, Experience, Testimonials, CallToAction |
| `btn`, `btn-primary`, `btn-outline`, `btn-lg` | CallToAction |
| `hero-section`, `hero-inner`, `hero-bg`, `hero-title`, `rotating-words`, `hero-visual`, `hero-avatar-container`, `hero-avatar`, `hero-avatar-border`, `scan-line-mask`, `hero-bottom`, `hero-bottom-left`, `hero-tagline`, `hero-profile-link`, `hero-cta-text` | Hero |
| **Unused (delete):** `container`, `site-header`, `.scrolled`, `nav-container`, `hero-cta`, `hero-prop*`, `sticker-3d`, `sticker-glare`, `btn-cv`, `draw-animation`, `@property --border-angle`, `@keyframes drawBorder`/`fadeBorder`, the dark-mode `--background`/`--foreground` vars and their `@theme inline` colours | — |

## Decisions / assumptions

1. **All styling goes inline.** Every old class is replaced by Tailwind utilities written directly in that element's `className`. There are no shared style constants, no `utils/styles.ts`, no `cva` recipes and no new wrapper components. Patterns used in several places (container, gradient text, gradient badge) are written out in full at each call site.
2. **`globals.css` keeps only a small `@theme` block.** It holds colour tokens, the font, breakpoints and the `shine` keyframes. That block is Tailwind's own config in v4, not plain CSS, and it keeps the inline classes short and readable (`text-muted`, `from-accent-1`, `bg-surface`, and not repeating hex codes everywhere). The `shine` keyframes have to live there because Tailwind has no inline way to declare keyframes. There are no selectors, no `:root` block, no media queries and no `@utility`/`@layer` rules.
3. **`text-muted` keeps its name.** Defining `--color-muted` in `@theme` turns `text-muted` into a real Tailwind utility, so the ~20 existing `text-muted` usages need no change.
4. **Gradients use sRGB interpolation** (`bg-linear-65/srgb`). Tailwind v4 defaults to `in oklab`, which would shift the pink→purple colours slightly.
5. **`grad-text` on SVG icons is dropped, not converted.** Currently `background-clip:text` has no visible effect on `<svg>` (fill uses `currentColor`), so the icons render in their inherited colour. Converting to `text-transparent` would make them invisible. Affected: Project arrow SVG, Testimonials `FaQuoteLeft`, Navbar `FaArrowRight` (keeps its `text-purple-500`).
6. **The Hero wrapper does not use the standard container classes.** Because of the cascade order in the current CSS, `.hero-inner` overrides `.main`. The effective styles are `max-width:1200px` at every width and padding `20px`, then `32px` from md up, even at lg. Those effective values are inlined so nothing shifts.
7. **Intentional fix: hero background image path.** `url(/public/img/hero-bg.png)` 404s because Next serves `public/` at `/`. It becomes `bg-[url(/img/hero-bg.png)]`, so **the hero background will start to appear**. This is the only visual change.
8. The undefined `btn-text` class in Hero is removed (no-op).
9. Add `"typecheck": "tsc --noEmit"` to `package.json` so the check that AGENTS.md documents actually exists.
10. Out of scope, flagged only: Navbar uses `bg-primary` (no such token, renders transparent) and `hover:text-` (incomplete class). These are left untouched so behaviour stays the same.

## Files likely to change

- `app/globals.css`: reduced from ~495 lines to ~30 (`@import` + `@theme` + `@theme inline`)
- `app/layout.tsx`: base `html`/`body` styles as inline utilities
- `sections/Hero.tsx`, `sections/CallToAction.tsx`, `sections/Project.tsx`, `sections/Experience.tsx`, `sections/Testimonials.tsx`
- `components/layout/Navbar.tsx`, `components/layout/Footer.tsx` (Footer has uncommitted edits; preserve them), `components/ui/Logo.tsx`
- `package.json`: add `typecheck` script
- No new files.

## Implementation requirements

### `app/globals.css` (entire final file)

```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 375px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1200px;

  --color-surface: #05000a;
  --color-card: #131320;
  --color-card-hover: #1a1a2e;
  --color-fg: #e8e6f0;
  --color-muted: #8a8694;
  --color-dim: #5c586a;
  --color-accent-1: #de0eff;
  --color-accent-2: #751cff;
  --color-badge: #12041a;

  --animate-shine: shine 0.7s ease-in-out;
  @keyframes shine {
    0% { left: -100%; }
    100% { left: 200%; }
  }
}

@theme inline {
  --font-sans: var(--font-atydisplay), sans-serif;
}
```

(`--font-sans` feeds Preflight's default font-family, which replaces `body { font-family }`.)

### `app/layout.tsx`

- `<html>`: add `scroll-smooth [-webkit-tap-highlight-color:transparent]` to the existing classes
- `<body>`: `flex min-h-screen flex-col bg-surface text-fg leading-[1.6]`

### Inline replacements for shared classes

Replace the class name in place with these utilities, keeping any utilities already on the element:

| Old class | Inline Tailwind utilities |
|---|---|
| `main` | `mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20` |
| `grad-text` (text only) | `bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent` |
| `grad-badge` | `inline-flex items-center gap-1.5 rounded-[10px_30px_30px_10px] border-2 border-transparent px-5 py-3.5 text-lg font-medium text-fg [background:linear-gradient(var(--color-badge),var(--color-badge))_padding-box,linear-gradient(45deg,#f505ff,#731cff)_border-box]` |
| `text-muted` | unchanged (now a theme utility) |

If an element already has a utility that conflicts with the inlined ones, drop the duplicate so each property appears once.

### `sections/CallToAction.tsx` buttons (inline)

- **Both buttons, shared:** `relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[50px] px-9 py-[18px] text-base font-semibold transition-all duration-300 ease-in-out active:scale-[0.96] [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1` (`btn` + `btn-lg`)
- **"Let's Work" (primary), add:** `bg-linear-65/srgb from-accent-1 to-accent-2 text-white shadow-[0_4px_20px_rgba(222,14,255,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(222,14,255,0.4)] after:absolute after:top-0 after:-left-full after:h-full after:w-1/2 after:-skew-x-20 after:bg-linear-to-r after:from-transparent after:via-white/25 after:to-transparent after:content-[''] hover:after:animate-shine`
- **"Download CV" (outline), add:** `border border-white/12 bg-[rgba(81,44,111,0.4)] text-fg uppercase tracking-[1px] backdrop-blur-md hover:border-accent-1 hover:bg-accent-1/6 hover:text-white`

### `sections/Hero.tsx` (exact effective values)

| Old | New inline utilities |
|---|---|
| `hero-section` | `flex min-h-[calc(100vh-72px)] items-center justify-center px-5 pt-20 pb-16 text-center` |
| `main hero-inner hero-bg` | `mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center gap-10 px-5 md:gap-14 md:px-8 bg-[url(/img/hero-bg.png)] bg-cover bg-center bg-no-repeat` |
| `grad-badge` | the inline badge utilities above |
| `hero-title` | `m-0 max-w-[960px] text-[clamp(2.25rem,8vw,3.6rem)] font-extrabold leading-[1.02] md:text-[clamp(2.5rem,5vw,5rem)]` |
| `rotating-words grad-text` | `inline-block` + the inline gradient-text utilities |
| `hero-visual` | `relative z-1 mx-auto flex w-full max-w-[860px] items-center justify-center` |
| `hero-avatar-container` | `relative mx-auto inline-flex w-[min(100%,560px)] max-w-[560px] items-center justify-center` |
| `hero-avatar` | `z-2 block h-auto w-full rounded-[1.25rem] drop-shadow-[0_24px_64px_rgba(0,0,0,0.35)]` |
| `hero-avatar-border` | `pointer-events-none absolute inset-0 z-1 h-full w-full object-contain transform-gpu` |
| `scan-line-mask` | `pointer-events-none absolute inset-0 z-3 before:absolute before:inset-0 before:opacity-25 before:content-[''] before:bg-[repeating-linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08)_2px,transparent_2px,transparent_4px)]` |
| `hero-bottom` | `relative z-3 mx-auto mt-0 flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-6 px-6 pb-5 md:-mt-[60px] md:px-8 md:pb-0` (at md+ the old `padding: 0 32px` resets the bottom padding to 0) |
| `hero-bottom-left` | `flex w-full max-w-[720px] flex-col items-center gap-4 text-center` |
| `hero-tagline` | `m-0 w-full text-base leading-[1.75] text-muted` |
| `btn-text hero-profile-link` | `inline-flex items-center gap-2 text-[0.95rem] font-medium text-[#a2a2a2] no-underline transition-colors duration-200` |
| `hero-cta-text` | `font-semibold` |

## Security requirements

- No new dependencies.
- No `dangerouslySetInnerHTML`, inline `style` injection or runtime-generated class names; all styling stays static class strings.
- The background image URL is a static, same-origin path.
- Keep the existing `rel="noopener"` on the external `target="_blank"` link.

## Acceptance criteria

- `app/globals.css` is about 30 lines and contains only `@import "tailwindcss"`, `@theme { … }` and `@theme inline { … }`. No selectors, no `:root`, no media queries, no plain CSS rules.
- None of these strings remain in any `className`: `main`, `grad-text`, `grad-badge`, `btn`, `btn-*`, `hero-*`, `rotating-words`, `scan-line-mask`, `btn-text`.
- No new style-helper files or constants; all utilities are written inline.
- The site looks the same at 375px, 768px, 1200px and 1440px widths as before the change, except that the hero background image now appears.
- Gradient text (logo, headings, "Start A Project", etc.) still shows the pink→purple gradient. SVG icons that previously had `grad-text` are still visible, in the same colour.
- CTA buttons keep their hover lift, glow, shine sweep, arrow nudge and active press-down.
- Font is still Atyp Display, and smooth scrolling still works.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
wc -l app/globals.css
grep -rnE "\b(grad-text|grad-badge|hero-[a-z-]+|btn(-[a-z]+)?|rotating-words|scan-line-mask)\b" app components sections
```

(Expected: `globals.css` is about 30 lines, and the grep finds no `className` hits.)

## Manual test steps (to share after implementation)

1. `npm run dev` and open http://localhost:3000.
2. In DevTools device mode, check widths 375, 768, 1200 and 1440:
   - Hero: badge with gradient border, large title with the typing gradient word, avatar with outline and scan lines, tagline and "Corporate Profile" link, "LET'S WORK" pill. The background image should now be visible behind the hero.
   - Project, Testimonials, Experience: gradient badges, gradient sub-headings, muted body text, content aligned to the same container width as before.
   - CTA: hover "Let's Work" (lifts, glow grows, shine sweeps, arrow moves right). Click and hold (scales down). Hover "Download CV" (border turns pink).
   - Navbar and Footer: gradient logo, "Start A Project" gradient text with a purple arrow.
3. Click an in-page `#` link to confirm smooth scroll still works.
4. Optional side-by-side: `git stash`, screenshot, `git stash pop`, screenshot, then compare.
