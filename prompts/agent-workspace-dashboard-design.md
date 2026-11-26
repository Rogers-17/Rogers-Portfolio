# Agent workspace: match the admin dashboard design

## Goal

`/admin/assistant` currently looks like a separate app running inside the dashboard: its own framed window (`rounded-3xl` panel with `shadow-2xl`), its own 240 px sidebar with a second navigation, its own notice bar, browser `window.confirm`/`window.prompt`, and its own field and button styles. Rebuild the page's presentation so it reads as one more admin page, like Projects, Job tracker, Documents and Resume settings: the same page header, cards, fields, buttons, chips, toasts and dialogs. **Behavior stays the same**: every API call, chat mode, project, memory import, automation, and the confirm-before-write proposal flow work exactly as today.

## Skills and guidance read

- `AGENTS.md`: prompt approval before code, UI prompt requirements, checks, test steps, commit rule.
- No user-named skill. Supporting guidance: the existing admin design system in `components/admin/Field.tsx`, `Toast.tsx`, `Dialog.tsx`, and existing page compositions (below).
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (static `metadata` export on the page, the same pattern `app/admin/(dashboard)/jobs/page.tsx` uses).

## Existing code inspected

- `components/admin/assistant/AssistantWorkspace.tsx` (410 lines): renders its own `<main>` (nested inside AdminShell's `<main>`, which is invalid HTML), `max-w-[1600px]` with its own padding on top of the shell's padding, an eyebrow + title header, a framed `grid … rounded-3xl … shadow-2xl lg:grid-cols-[240px_1fr]` window, an inner sidebar (New chat button, 5-item nav, history search/list, temporary-chat note), a local `notice` banner, local `field` class (`bg-black/20`), local `Field`/`ToolToggle` components, checkboxes with `accent-fuchsia-500`, amber notice boxes, `window.confirm` (project delete), and `window.prompt` (rename chat). Chat history delete has no confirmation at all.
- `components/admin/AdminShell.tsx`: provides the `<main>` (`px-4 pt-20 md:px-8 md:pt-8 lg:px-10 lg:pt-10`, `max-w-6xl` content), the left nav (label "Agent workspace"), `ToastProvider` and `DialogProvider`.
- `components/admin/Field.tsx`: `inputClass`, `TextField`, `TextAreaField`, `SelectField`, `Switch`, `Card`, `primaryButtonClass`, `secondaryButtonClass`, `iconButtonClass`.
- `components/admin/Toast.tsx` (`useToast().notify(message, "success" | "error")`), `components/admin/Dialog.tsx` (`useDialog().confirm/prompt`).
- Page header pattern: `app/admin/(dashboard)/projects/page.tsx`, `resume-settings/page.tsx` (`mb-6 md:mb-8`, `h1 text-2xl font-bold md:text-3xl`, `p mt-1 text-sm text-muted`, primary action on the right).
- Toolbar and chip patterns: `components/jobs/JobTracker.tsx` (segmented `rounded-full border border-white/10 p-1` control, amber notice `rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-sm`), `components/documents/DocumentArchive.tsx` (`chip()` filter pills, horizontally scrolling on phones, search with leading icon).
- `components/admin/assistant/ProposalCard.tsx`, `AssistantDrawer.tsx`: unchanged.

## Decisions and assumptions

1. Only presentation changes. State, handlers, API calls, request bodies, and the export parser stay as they are, apart from routing messages to toasts and dialogs.
2. Remove the inner "app window": no framed outer panel, no inner sidebar navigation, no nested `<main>`, no own max-width or page padding. The page lives in the shell's `max-w-6xl` column like every other page.
3. Sections become a **chip tab row** under the header (Chat · Projects · Memory · Automations · Settings), using the Documents `chip()` look and accessible tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation).
4. Chat history is content, not navigation: on the Chat tab it is a dashboard `Card`-style panel beside the conversation on `lg+`, and a collapsible panel on smaller screens.
5. The page title matches the sidebar label: **"Agent workspace"**. The subtitle names the assistant (`profile.assistant_name`, default "Rogers"). The "Grounded by portfolio data · Gemini" pill and the eyebrow are removed (no other admin page has them).
6. The local `notice` banner is replaced by dashboard toasts: success messages use `notify(msg)`, failures use `notify(msg, "error")`. Import progress stays inline (it is a live status, not a toast).
7. `window.confirm` / `window.prompt` become `useDialog().confirm` / `prompt`. Add the missing confirmation for deleting a chat, deleting an imported memory source, and deleting an automation (`tone: "danger"`).
8. Tool checkboxes become the dashboard `Switch` rows. Fields use `TextField` / `TextAreaField` / `SelectField` / `inputClass`. Buttons use `primaryButtonClass` / `secondaryButtonClass` / `iconButtonClass`, with the rose danger variant used elsewhere.
9. The memory privacy text the owner quoted ("Import stores supported user and assistant text…") is kept word for word, shown as the dashboard's standard amber notice style (JobTracker pattern), not a custom one-off box. The automation `CRON_SECRET` warning uses the same style.
10. The transcript viewer modal keeps its behavior but uses the same surface as the dashboard dialogs (`bg-card`, `rounded-2xl`, `border-white/10`).
11. Add `export const metadata = { title: "Agent workspace | Rogers admin" }` to the page.

## Files likely to change

- `components/admin/assistant/AssistantWorkspace.tsx`
- `app/admin/(dashboard)/assistant/page.tsx` (metadata only)

## Visual interpretation and layout

**Page header** (same as Projects):
- Wrapper `mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8`.
- Left: `h1` "Agent workspace" `text-2xl font-bold md:text-3xl`. Subtitle `mt-1 text-sm text-muted`: "Chat with {name}, manage projects and memory, and schedule research. Site changes always wait for your confirmation."
- Right: primary pill button "New chat" (`primaryButtonClass`, `FiPlus` icon). It switches to the Chat tab and starts a new saved chat (existing `newSavedChat`).

**Section tabs**:
- `mb-5 flex gap-2`; on phones `-mx-4 overflow-x-auto px-4 pb-1` with the scrollbar hidden; from `md` it wraps.
- Each tab is a chip: `inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold`. Active: `border-accent-1/60 bg-accent-1/12 text-white`. Inactive: `border-white/10 text-muted hover:border-white/25 hover:text-white`. A 15 px Feather icon before the label (`FiZap`, `FiFolder`, `FiBookOpen`, `FiClock`, `FiSettings`). Counts in `text-xs font-medium text-dim` for Projects, Memory and Automations.

**Chat tab**:
- Grid `grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]`.
- **History panel** (left, `lg+`): `rounded-2xl border border-white/6 bg-card p-4`, `lg:sticky lg:top-10 lg:self-start`, list `max-h-[calc(100dvh-16rem)] overflow-y-auto`. Top row: "History" `text-sm font-semibold` plus a segmented Active/Archived control (JobTracker segmented style, small). Below: search `inputClass pl-9` with `FiSearch` at `left-3`. Items: `rounded-lg px-2.5 py-2 text-sm`, active `bg-white/6 text-white`, idle `text-muted hover:bg-white/4 hover:text-white`, title truncated, relative date `text-xs text-dim` under the title. Row actions (rename, archive/restore, delete) use `iconButtonClass`-sized icon buttons, shown on hover or focus on desktop and always visible on touch (`lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100`). Empty state `text-sm text-dim`. The temporary-chat explanation moves to a `text-xs text-dim` footnote at the bottom of this panel.
- **Below `lg`**: the history panel is hidden behind a `secondaryButtonClass` "History" toggle in the conversation header. When open, it renders above the conversation as the same card.
- **Conversation card** (right): `flex min-h-[32rem] flex-col rounded-2xl border border-white/6 bg-card`, height `lg:h-[calc(100dvh-13rem)]` so the composer stays visible and only messages scroll.
  - Header `flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-4 py-3 md:px-6`: title `text-base font-bold` (truncate) with the mode subline `text-xs text-dim`; right side: project select and chat-type select (`inputClass w-auto py-2 text-sm [&>option]:bg-card`), "Save chat" `secondaryButtonClass` for temporary chats with messages.
  - Messages `flex-1 overflow-y-auto px-4 py-5 md:px-6 space-y-4`, `aria-live="polite"`. User bubble: `ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/6 px-4 py-3 text-sm leading-relaxed`. Assistant bubble: `mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-white/6 bg-white/2 px-4 py-3`. Sender label `text-[11px] font-semibold tracking-wider text-dim uppercase`. Citations as small rounded-full chips `border-white/10 text-xs text-accent-1`. ProposalCards stay under their message.
  - Thinking state: three-dot pulse plus "{name} is thinking…" `text-sm text-muted`.
  - Empty state centered: 48 px `rounded-2xl bg-accent-1/10 text-accent-1` icon tile, `text-lg font-bold` "What can I help you with?", `text-sm text-muted` line, suggestion chips (same chip style as the tabs).
  - Composer `border-t border-white/6 p-3 md:p-4`: `inputClass`-styled textarea (`field-sizing-content min-h-12 max-h-40 resize-none`) with a round 40 px gradient send button (`bg-linear-65/srgb from-accent-1 to-accent-2`, matching the primary button gradient) aligned bottom-right; under it `text-xs text-dim` "{n}/4000 · Enter to send, Shift+Enter for a new line". The temporary-chat privacy note sits under the composer in `text-xs text-dim`.

**Projects tab**: grid `grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]`.
- Left: `Card` "New project" (hint "Instructions, files and tools for focused chats.") with `TextField` Name, `TextAreaField` Instructions, `primaryButtonClass` "Create project".
- Right: one `Card` per project: title = project name, `action` = "Use in chat" chip (active chip style when selected). Body: `TextField` name, `TextAreaField` instructions; "Tools" group as `Switch` rows (label `text-sm font-medium`, detail `text-xs text-dim`, switch right-aligned, rows `divide-y divide-white/6`); files list rows `flex items-center justify-between rounded-xl border border-white/6 bg-white/2 px-3 py-2 text-sm` with an icon "Remove" button; footer `flex flex-wrap gap-2`: Save (`primaryButtonClass`), "Add TXT / MD / PDF" (`secondaryButtonClass` label wrapping the hidden file input), Delete (rose secondary variant `hover:border-rose-400 text-rose-300`) behind a danger confirm dialog.
- Empty state inside a dashed card `rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted`.

**Memory tab**: `flex flex-col gap-5`.
- `Card` "Import chat history" (hint "Make past ChatGPT or Claude chats searchable. This personalizes retrieval; it doesn't train the model."). Inside: the amber notice (JobTracker style) with the exact privacy text, then a `sm:grid-cols-2` row with `SelectField` "Export provider" and a file field (`inputClass` with `file:` styles: `file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:text-fg`). The preview row shows the detected count plus the primary "Import detected conversations" button; progress `role="status" text-sm text-muted`.
- `Card` "Imported sources" with a count in the title. Rows like the files list: title `text-sm font-medium`, meta `text-xs text-dim`, actions "Inspect" (`secondaryButtonClass` compact `px-4 py-2`) and Delete (rose, confirm dialog).

**Automations tab**: `flex flex-col gap-5`.
- Amber setup notice (same style) when `!automationReady`.
- `Card` "New research report": `TextField` name, `TextAreaField` instructions, grid `sm:grid-cols-2 xl:grid-cols-4` of `SelectField` project, `SelectField` cadence, time or datetime `TextField`, timezone `TextField`; weekday `SelectField` when weekly; primary "Schedule report"; `text-xs text-dim` delivery note.
- One `Card` per automation: title = name, hint = "cadence · expression · timezone", status badge in `action` (`rounded-full px-2.5 py-0.5 text-xs font-semibold`; enabled `bg-emerald-400/10 text-emerald-300`, paused `bg-white/6 text-muted`, failures `bg-rose-400/10 text-rose-300`). Body: instructions `text-sm text-muted whitespace-pre-wrap`, next run `text-xs text-dim`, buttons Run now / Pause or Enable / Run history (`secondaryButtonClass` compact), Delete (rose + confirm).
- Run history in a `Card` "Recent runs" with `<details>` rows separated by `border-white/6`.

**Settings tab**: `flex max-w-3xl flex-col gap-5`.
- `Card` "Profile": `TextField` Assistant name, `TextField` What should it call you?, `TextAreaField` Response style, Ongoing goals, Custom instructions (same max lengths).
- `Card` "Tools" (hint "What the assistant may use. Projects can narrow this further."): `Switch` rows as above, plus a "Search all saved chats" `Switch` row with its explanation.
- The data/quota note as `text-xs text-dim` under the cards.
- Save via `primaryButtonClass` "Save settings" at the bottom right of the form (same placement as other forms' primary action).

**Typography**: only the existing tokens (`text-fg`, `text-muted`, `text-dim`, `text-accent-1`), with no new colors or font sizes beyond those listed. Card titles `text-lg font-bold` (from `Card`), section labels `text-sm font-medium text-fg/90` (from `FieldShell`).

**Spacing**: page header `mb-6 md:mb-8`; tabs `mb-5`; grid and stack gaps `gap-5`; cards `p-4 md:p-7` (from `Card`), except the chat cards (`p-4` history, edge-to-edge conversation with inner `px-4 md:px-6`).

**Colors and surfaces**: surfaces are `bg-card` with `border-white/6`, inner rows `bg-white/2`/`bg-white/4`, inputs `bg-white/4 border-white/10 focus:border-accent-1`. No `bg-black/*` surfaces, no `shadow-2xl`, no `accent-fuchsia-500` checkboxes. Accent gradient only for primary actions, the send button, and active indicators. Amber is used only for notices, rose only for destructive actions and errors.

**Responsiveness**:
- `< md`: shell top bar. Tabs scroll horizontally. Chat is single column; history behind its toggle. Conversation card `min-h-[70dvh]`. Header selects wrap under the title. All touch targets at least 40 px (`iconButtonClass` already handles this).
- `md`–`lg`: same single column with more padding.
- `lg+`: two-column chat and projects; history sticky; conversation fills the viewport height minus header and tabs.
- No horizontal page scroll at 360 px wide.

**Pixel-perfect expectations**: put side by side with `/admin/projects` and `/admin/documents`, the header, the card radius and border, the input height and background, the button shapes (rounded-full pills), the chip style, and the toast placement must be identical. Nothing on the page should look like a nested window or a second sidebar.

## Implementation requirements

- Use `useToast` and `useDialog` (both providers already wrap the page via AdminShell).
- Replace `window.prompt` (rename) with `prompt({ title: "Rename chat", label: "Title", defaultValue, maxLength: 200, required: true })`; replace `window.confirm` (project delete) with `confirm({ tone: "danger", … })`; add danger confirms for chat delete, memory delete, and automation delete.
- Keep accessible names on all icon-only buttons. Tabs: roving `tabIndex`, Left/Right/Home/End keys, `aria-controls` → a `role="tabpanel"` with `aria-labelledby`.
- Keep `ProjectPanel` as a local component, restyled (it owns name, instructions and files state).
- Remove the now-unused local `Field`, `ToolToggle`, `field`, and `notice` state.
- Do not change `ProposalCard`, `AssistantDrawer`, any API route, `lib/agent/*`, or the export parsing and unzip helpers.

## Security requirements

- No change to what is sent to the server or to Gemini; proposals still require explicit Confirm.
- Destructive actions gain confirmation dialogs (strictly safer).
- Citation links keep `target="_blank" rel="noreferrer"` and `https?` URLs only, as today (server-filtered).
- No `dangerouslySetInnerHTML`; message text stays plain text with `whitespace-pre-wrap`.

## Acceptance criteria

- `/admin/assistant` has no framed outer window, no inner sidebar navigation, and no nested `<main>`; it sits in the shell's `max-w-6xl` column with the standard header.
- Tabs switch between the 5 sections; keyboard navigation works.
- Every existing flow still works: new and saved chats, temporary chats (both modes) plus "Save chat", project selection per chat, rename/archive/delete chat (via dashboard dialogs), search history, create/edit/delete projects, project tool switches, file upload and remove, memory import, inspect and delete, automation create/pause/enable/run/history/delete, settings save, proposal Confirm/Discard.
- Success and error messages appear as dashboard toasts.
- The layout works at 360 px, 768 px, 1280 px and 1600 px wide, with no horizontal page scroll.
- `npm run typecheck`, `npm run lint`, `npm run build` pass (build because a page file changes).

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Manual test steps (to share after implementation)

1. `npm run dev`, sign in, open `/admin/assistant`; compare with `/admin/projects` and `/admin/documents` (header, cards, inputs, buttons).
2. Chat: send "List my projects"; expect a reply in the conversation card; the chat appears in History. Rename it (dashboard dialog), archive and restore it with the Active/Archived toggle, then delete it (danger dialog).
3. Switch the chat type to "Temporary · personalized", send a message, click "Save chat"; it appears in History.
4. Ask "Change the tagline of StudyHub to 'Test tagline'"; expect a change card; Discard it.
5. Projects: create "Test project", toggle a tool switch, upload a small `.txt`, remove it, delete the project (danger dialog).
6. Memory: the privacy notice shows; choosing a provider and a JSON export shows the detected count (import optional).
7. Automations: the setup notice shows if not configured; the form renders in the grid.
8. Settings: change the assistant name, save; expect a success toast and the subtitle updates.
9. Resize to phone width: tabs scroll, the History toggle shows and hides the list, nothing overflows sideways.

## Addendum (requested during implementation)

1. **Working animations (owner request).** While a turn runs, show a "working" row: an animated eight-point spark, a rotating playful verb with a shimmer ("Pondering…", "Noodling…"), a live seconds counter, and a Stop button; Esc also interrupts (aborts the request and adds an "Interrupted" note). Messages rise in; fresh assistant replies are revealed progressively with a caret; each fresh reply shows "Answered in N.Ns · <model>" from real response data. The verbs describe mood, not specific steps, because the API returns the reply in one piece. Real step-by-step progress would need a streaming endpoint (follow-up). All motion uses `motion-safe:` and the typing reveal is skipped under `prefers-reduced-motion`. New theme tokens in `app/globals.css`: `animate-rise-in`, `animate-spark`, `animate-shimmer`.
2. **Memory import fix (owner report: a Claude import saved nothing).** The provider select defaulted to ChatGPT and the parser only read the selected provider's shape, so a Claude export was entirely skipped. The parser now detects each conversation's format from its shape (`mapping` → ChatGPT, `chat_messages` → Claude), records the provider per conversation, and pre-selects the detected provider. It also falls back to `content` blocks when a Claude message's `text` is empty (those messages were dropped before). Import is guarded against double runs and shows per-conversation progress.
3. Errors from a chat turn appear as an inline note in the conversation (next to where the answer would have been) instead of a toast.
