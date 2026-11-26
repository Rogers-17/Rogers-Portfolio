# Agent workspace: focused chat layout, motion that scales with the work, and Claude's new export format

## Goal

1. **Adaptive motion.** A quick "Hi" currently gets the full show: spinning spark, shimmering rotating verbs, a seconds counter, a typed-out reply and an "Answered in 0.9s" line. Make the animation scale with how much work is actually happening, so quick answers feel instant and calm and only long or substantial turns get the fuller treatment.
2. **Claude export import.** The owner chose `manifest-….json` from Claude's new export and got "No user/assistant conversations were found". The new export is split: a manifest listing download links for `light_metadata-000.zip`, `memories-000.zip` and `conversations-000.zip`. Recognize the manifest and explain what to choose instead, and accept the formats that may be inside the new `conversations-*.zip`.

## Skills and guidance read

- `AGENTS.md`: prompt approval, UI prompt requirements, checks, manual test steps, commit rule.
- `prompts/agent-workspace-dashboard-design.md` (including its addendum): the current workspace design, the working indicator, and the parser changes.
- No additional Next.js API surface (client component only).

## Existing code inspected

- `components/admin/assistant/AssistantWorkspace.tsx`: `WorkingIndicator` (spark spin + shimmer verb rotating every 2.6 s + seconds counter + Stop, shown immediately), `TypedText` (types every fresh reply over 300–1600 ms), `ChatBubble` (rise-in, avatar spark, "Answered in" meta on every fresh reply), empty state (spark spinning forever), `parseHistoryExport` / `normalizeConversations` / `unzipJsonFiles` (reads `.json` only; top-level array, `{ conversations: [...] }`, or a single conversation object).
- `app/globals.css`: `animate-rise-in`, `animate-spark`, `animate-shimmer`.
- The owner's pasted manifest: `{ instructions, created_at, total_files, data_files: [{ export_url, category: "conversations" | "memories" | "light_metadata", filename: "conversations-000.zip", part }], version }`.

## Decisions and assumptions

1. **The amount of work is measured by real signals only**: elapsed time while waiting, and after the reply its length, proposals, citations and duration. No fake step names.
2. **Waiting, in stages by elapsed time:**
   - 0–700 ms: nothing new beyond the user's message (most quick replies land here and never show an indicator).
   - 0.7–3 s: a small, quiet "typing" indicator: three softly pulsing dots in an assistant-style row. No spark spin, no shimmer, no counter.
   - 3–8 s: the status verb appears ("Thinking…") with a gentle shimmer; the spark appears static.
   - 8 s and over: the spark starts rotating, verbs rotate (every 3.5 s), and the seconds counter and Stop button appear.
   - Esc still interrupts at any stage.
3. **Reply reveal, by size:**
   - Short replies (< 280 characters, no proposals): appear at once with a soft fade (no typing, no caret).
   - Longer replies: typed reveal, with duration scaled to length (about 4 ms per character, minimum 400 ms, maximum 1200 ms).
   - Proposal cards rise in after the text finishes.
4. **Meta line only when it says something:** show "Answered in N.Ns" only when the turn took at least 5 s. Show "Prepared N change(s) for review" when proposals exist and "N source(s)" when citations exist. The model name stays in the meta line only when one is shown. Otherwise no meta line.
5. **Calmer defaults:** the empty-state spark is static (no infinite spin); message rise-in is shortened to 0.25 s with a 4 px offset; tab panel fade unchanged. Everything keeps `motion-safe:`; reduced motion shows text instantly.
6. **Manifest detection:** if a chosen JSON has `data_files` with `export_url` entries (Claude's export manifest), stop with a specific message: "This is Claude's export manifest, not your chats. Open the link for conversations-000.zip (and any conversations-001.zip …) from the export email or this file, download it, then choose that ZIP here." The app never opens those links: they carry the owner's private account data, and links expire after 24 hours.
7. **More formats accepted, all parsed in the browser (nothing uploaded raw):**
   - ZIP entries ending in `.json`, `.jsonl` or `.ndjson` (JSON Lines: one JSON value per line).
   - Top-level `.jsonl` / `.ndjson` files.
   - Conversation lists found under `conversations`, `data`, `items` or `results`, or a single conversation object per file (many files in one ZIP).
   - Claude messages under either `chat_messages` or `messages`, with `sender: "human"|"assistant"` or `role: "user"|"assistant"`, and text in `text` or `content` blocks. A conversation whose messages use `sender: "human"` is marked Claude.
   - Picking several files at once (`multiple`) so `conversations-000.zip` and `conversations-001.zip` import together. `light_metadata` and `memories` ZIPs contribute nothing and are counted as skipped, without failing the import if a conversations file is also chosen.
   - If no conversations are found, the error names what was inside (for example "Found 2 JSON files (users.json, projects.json) but no conversations"), so the owner knows they chose the wrong file.
8. Importing Claude's separate `memories` file (Claude's saved memory notes) is out of scope; its format is unverified. Follow-up if wanted.
9. **Optional verification:** if the owner places `conversations-000.zip` in the project folder or tells me its path, I'll inspect only its **structure** (file names and JSON keys, not message text) to confirm the parser matches. Nothing is sent anywhere.

## 3. Focused chat layout, Claude-style (owner request)

The owner wants the Chat tab to feel like a focused chat app: the top bar stays put, the conversation is a calm centered column, and the message box is pinned at the bottom. Use the familiar chat-app **layout pattern** only: no Claude branding, logo, colors or copy. The dashboard's tokens, accent gradient, fonts and admin shell stay as they are.

**Static frame**
- On the Chat tab the workspace fills the viewport: the page header and tabs collapse into **one compact row** (`h1` "Agent workspace" `text-xl font-bold` on the left; the chip tabs on the right, same chip style; "New chat" becomes an icon+label small button in this row). On other tabs the normal page header stays as it is now.
- Below it, a chat frame of fixed height (`h-[calc(100dvh-8.5rem)]` on md+, and on phones the height minus the shell's 56 px top bar). Only the message list scrolls; the frame never scrolls the page.
- `AdminShell`: add an `/admin/assistant` "full-height" flag (like the existing `WIDE_ROUTES`) that reduces the shell's bottom padding on this route (`pb-6` instead of `pb-40 / md:pb-32`), so the page itself doesn't scroll under the fixed chat frame. Width stays `max-w-6xl`.

**Chat frame** (one `rounded-2xl border border-white/6 bg-card` surface, `overflow-hidden`, flex row):
- **History sidebar** (left, `w-64`, `border-r border-white/6`, `bg-white/1`): "New chat" row at the top, search, then the Active/Archived toggle and the chat list (same row design and hover actions as now), and the temporary-chat footnote at the bottom. A toggle button in the top bar collapses or expands it (the state is remembered in `localStorage`). On phones it opens as an overlay sheet over the conversation (`absolute inset-y-0 left-0 w-72 bg-card shadow-2xl`, a backdrop, Esc closes it).
- **Top bar** (static, `h-14 shrink-0 border-b border-white/6 px-4`): sidebar toggle icon button; chat title (`text-sm font-semibold`, truncated, click to rename via the dashboard prompt dialog); right side: "Save chat" for temporary chats and a "Temporary" pill when in a temporary mode.
- **Conversation column**: the scroll area spans the full width, content centered `mx-auto w-full max-w-3xl px-4 md:px-6 py-6 space-y-6`.
  - **User messages**: right-aligned soft bubble `max-w-[80%] rounded-2xl bg-white/6 px-4 py-2.5 text-[15px] leading-relaxed`.
  - **Assistant messages**: no bubble; full-width text `text-[15px] leading-7 text-fg` with a small 28 px avatar (the dashboard's `FiZap` in an `bg-accent-1/10 text-accent-1` circle, replacing the asterisk spark so it matches the sidebar's assistant icon). Citations as small chips under the text. A hover/focus action row under each assistant message: **Copy** (copies the reply text; shows "Copied" for 1.5 s). Proposal cards render inline under the message.
  - Notes (errors, interrupted) as centered small muted pills, as now.
- **Composer** (pinned at the bottom of the column, `max-w-3xl mx-auto w-full px-4 pb-4`): one large box `rounded-3xl border border-white/10 bg-white/4 focus-within:border-accent-1/60 shadow-[0_8px_30px_rgba(0,0,0,0.25)]`:
  - an auto-growing textarea (`field-sizing-content min-h-14 max-h-56`, transparent, `px-4 pt-3.5`, `text-[15px]`);
  - a toolbar row inside the box (`flex items-center gap-2 px-3 pb-3`): on the left two pill selects, **project** (`FiFolder` + name or "No project") and **chat type** ("Saved" / "Temporary" / "Temporary · unpersonalized"), styled as `rounded-full bg-white/4 border border-white/10 px-3 h-8 text-xs`; on the right the character count (only when over 3,500 characters) and the round send/stop button (36 px; gradient when ready, muted disabled, stop square while busy).
  - Under the box: one centered `text-xs text-dim` line: "{name} can make mistakes. Site changes always wait for your confirmation." In temporary mode: "Temporary chat: not saved to history."
- **Empty state (no messages)**: the composer moves to the vertical center of the column with a greeting above it: `text-2xl md:text-3xl font-semibold` "Good {morning|afternoon|evening}{, owner name}", from the browser's local time and `profile.owner_name`, and the suggestion chips below it. When the first message is sent, the layout switches to the normal bottom-pinned composer with a short motion-safe transition.

**Responsiveness**
- `< md`: no persistent sidebar (overlay sheet); top bar keeps the toggle, title and Temporary pill; composer pill selects shrink to icon + short label; the frame height accounts for the shell's top bar.
- `md`–`lg`: sidebar collapsed by default, toggle opens it inline.
- `lg+`: sidebar open by default (remembered).

**Pixel expectations**: the message column never exceeds `max-w-3xl`; the composer and messages share the same left and right edges; the top bar and composer never move when the conversation scrolls; nothing scrolls the page on the Chat tab at 360, 768, 1280 or 1600 px wide.

## Files likely to change

- `components/admin/assistant/AssistantWorkspace.tsx`
- `components/admin/AdminShell.tsx` (full-height flag for `/admin/assistant`)
- `app/globals.css` (rise-in timing and offset)

## Visual interpretation

- **Quick turn (< 0.7 s):** the user's bubble, then the answer fades in. Nothing else moves.
- **Normal turn (0.7–3 s):** a 32 px assistant row with three 6 px `bg-muted` dots pulsing in sequence (150 ms stagger), no text.
- **Thinking (3–8 s):** the dots are replaced by a static spark avatar plus "Thinking…" in `text-sm` with a subtle shimmer.
- **Long turn (8 s and over):** the spark rotates slowly, verbs rotate, `text-xs text-dim` "12s", and a "Stop" text button on the right.
- Same colors, radii and typography as now; only when and how much things move changes.

## Implementation requirements

- `WorkingIndicator` computes the stage from elapsed time with one 250 ms interval and renders the stage's UI; verb rotation starts only in the long stage.
- `TypedText` gets an `animate` decision from `ChatBubble`: animate only when `fresh && (content.length >= 280 || proposals?.length)`; otherwise fade.
- `ChatBubble` meta: build the parts list from `ms >= 5000`, proposals count and citations count; render only if non-empty.
- Parser: add `parseJsonLines`, a manifest check, recursive-lite discovery (top-level array, known list keys, single object), `.jsonl`/`.ndjson` in `unzipJsonFiles` (rename `unzipDataFiles`), `multiple` file input that merges the results, and the descriptive error. Keep the 50 MB per-file and 100 MB unzip safety limits; add a 150 MB total limit across selected files.
- No API, schema or server changes.

## Security requirements

- Export links in a manifest are never fetched or rendered as clickable links by the app.
- Parsing stays in the browser; only normalized user/assistant text is sent to the existing import route, as today.
- Size limits stay enforced; JSON Lines parsing skips malformed lines instead of failing.

## Acceptance criteria

- Sending "Hi" with a sub-second reply shows no spark, no verbs, no counter and no meta line; the answer just fades in.
- A 3–8 s turn shows the quiet dots, then "Thinking…"; only turns of 8 s or more show the rotating spark, counter and Stop.
- Short replies are not typed out; long replies are.
- Choosing the manifest JSON shows the specific manifest message.
- Choosing `conversations-000.zip` imports the conversations (verified against the real structure if the owner allows the structure check; otherwise against the documented shapes above).
- Chat tab: the top bar and composer stay fixed while only messages scroll; the page itself doesn't scroll; the history sidebar collapses and expands (remembered); on phones it opens as an overlay sheet.
- Empty chat shows the centered greeting and composer; after the first message the composer is pinned at the bottom.
- The Copy action copies an assistant reply.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- A local parser check on sample data: the old shape, the manifest, a JSONL file, and a ZIP with one file per conversation.

## Manual test steps (to share after implementation)

1. `npm run dev`, open `/admin/assistant`, send `Hi`: the reply fades in with no indicator theatrics.
2. Send `Summarize all my portfolio projects in detail`: expect dots, then "Thinking…"; if it takes 8 s or more, the spark spins with a counter; the long reply types out.
3. Memory tab: choose the manifest JSON and expect the manifest message.
4. Open the `conversations-000.zip` link from the manifest or email, download it, choose it in the Memory tab: expect "Found N conversations from Claude", then Import, and the sources list fills.
5. Settings: make sure "Imported chat memory" is on; ask about something from an old Claude chat.
6. Chat layout: with a long conversation, scroll; the top bar and composer stay put and the page doesn't scroll. Toggle the history sidebar, reload, and its state is remembered. Hover a reply and click Copy.
7. Start a new chat: the greeting and composer are centered; send a message and the composer moves to the bottom.
8. Phone width: the history toggle opens an overlay sheet, Esc or the backdrop closes it, and the composer pills fit on one line.
