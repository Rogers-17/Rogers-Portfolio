# Personal admin assistant workspace: chats, projects, tools, and memory

## Goal

Build a named, customizable, ChatGPT-like assistant workspace for the owner: saved conversation history, temporary chats, projects with their own instructions/files/tools, editable global profile/custom instructions, selectable built-in tools, ChatGPT/Claude export memory, cited web research, and scheduled research automations that run while the user is away. Make it a general conversational LLM grounded in the admin's site content, profile, selected project context, relevant imported chats, and verified web sources. It can answer questions, explain, summarize, draft, research, run scheduled read-only research, and manage the site's supported content. Every site mutation must be shown in a complete review and explicitly confirmed. The first automation release stores research results in the app/projects; it does not act in external accounts.

Before an admin confirms a proposed action, let them inspect the complete current item and the full proposed result, including untruncated before/after values. This is private, searchable memory (retrieval at request time), not model fine-tuning. Do not connect to either provider account or upload raw export archives to another AI service.

## Skills and guidance read

- `AGENTS.md`: prompt approval, current Next.js docs requirement before code, POST for mutations, Supabase as source of truth, required checks, manual test instructions, and commit rule.
- `C:/Users/USER/.codex/skills/.system/openai-docs/SKILL.md`: use official product documentation to verify current ChatGPT behavior and avoid implying this app has identical provider behavior or retention.
- No user-named or approved implementation skill applies to this feature.
- Official export guidance: [Export ChatGPT history and data](https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data) and [Export Claude data](https://privacy.claude.com/en/articles/9450526-export-your-claude-data). Both exports are user initiated; archive contents and expiry remain controlled by the providers.
- ChatGPT feature references for product behavior: [Projects](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt), [Temporary Chat](https://help.openai.com/en/articles/8914046-temporary-chat-in-chatgpt), [Memory](https://help.openai.com/en/articles/8590148-memory-in-chatgpt), and [Custom Instructions](https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions). Use these as feature references, not as a claim that this app shares ChatGPT's provider behavior or retention terms.
- Official research grounding: [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) and [Gemini API pricing and limits](https://ai.google.dev/gemini-api/docs/pricing). Use actual returned citation annotations; disclose that usage/limits can vary and apply configurable query and cost caps.
- Official Vercel background execution references: [Schedules](https://vercel.com/docs/schedules), [Queues](https://vercel.com/docs/queues), and [Background Workers](https://vercel.com/docs/background-workers). Schedules/Queues are currently marked Beta in their docs; verify current project/account support and limits before implementation.
- `prompts/admin-agent-adk.md` and `prompts/admin-agent-resilience.md` for the assistant's architecture, confirmation boundary, error behavior, and security conventions.

## Existing code inspected

- `components/admin/assistant/AssistantDrawer.tsx`: assistant drawer and bounded `sessionStorage` transcript; there is no persistent native conversation history yet.
- `app/api/admin/agent/route.ts` and `app/api/admin/agent/confirm/route.ts`: authenticated request and explicit mutation-confirmation routes.
- `lib/agent/tools.ts`, `lib/agent/run.ts`, `lib/agent/schemas.ts`, and `lib/agent/registry.ts`: ADK tools, prompt execution, and content adapters.
- `lib/agent/proposals.ts` and `components/admin/assistant/ProposalCard.tsx`: proposal diff generation, value truncation, and confirmation UI.
- `lib/admin/auth.ts`, `lib/admin/client.ts`, and `lib/supabase/session.ts`: admin session, API response, and Supabase access patterns.
- `components/admin/AdminShell.tsx`: sidebar navigation and dark admin styling.
- `supabase/migrations/20261002000000_resume_builder.sql`: existing private-table and RLS conventions.
- `lib/storage.ts`, `lib/admin/direct-upload.ts`, `app/api/admin/uploads/sign/route.ts`, and `app/api/admin/uploads/confirm/route.ts`: bucket typing and secure signed-upload pattern.
- `app/api/admin/documents/route.ts`, `lib/documents/sniff.ts`, and `package.json`: admin file validation/storage conventions and existing `unpdf` PDF parser dependency.
- `next.config.ts`, `lib/site.ts`, `package.json`, and project config search: current Vercel-oriented runtime and the absence of configured Vercel schedules/queues (`vercel.json` is not present).
- `package.json`: Next.js 16.2.9, React 19, Zod 4, and current dependencies; no archive parser or vector database library is currently installed.

## Decisions and assumptions

1. Supported path is a user-driven upload of a ChatGPT or Claude export archive/JSON. There is no direct ChatGPT/Claude history API connection in this feature.
2. Parse exports in the browser and send only normalized conversation text and metadata to this Supabase project. Do not send raw archives, attachments, images, or audio to the server or Gemini.
3. Support text search with Postgres full-text search and ranking. Do not add embeddings, a vector service, or another model call; this keeps retrieval understandable and cost predictable.
4. Store one or more bounded text chunks per conversation, linked to an import source. Preserve provider, export conversation identifier (when available), title, creation date, and chunk order. Re-imports should upsert/deduplicate by source and external conversation identifier rather than duplicate every row.
5. Limit request and chunk sizes, but do not silently truncate supported transcript text. Split each supported conversation into ordered bounded chunks and send them in retryable batches. Set and disclose an archive-size ceiling; if it is exceeded, reject the file before import with a clear explanation. The UI should show progress and skipped/unsupported records. Use a maintained ZIP parser only if needed and inspect its current API before using it.
6. The assistant may retrieve only a small number of relevant excerpts for a turn (for example, up to five excerpts with a strict total character limit). It should identify each source by provider, title, and date when referencing it, and say when no useful match was found.
7. All imported transcript text is untrusted reference data. It cannot override system instructions or authorize actions. Existing writes continue to require the separate proposal confirmation flow.
8. Show a clear disclosure before import and in memory settings: imported text is stored in this Supabase project, matching excerpts may be sent to Gemini as part of an assistant request, raw uploads/attachments are excluded, and a source can be deleted.
9. Keep the assistant useful as a general LLM: answer conversational questions and help summarize, explain, brainstorm, and draft using relevant site records and retrieved chats when useful. It must not claim to have consulted content it did not retrieve, and should distinguish source-backed facts from suggestions. Do not add another model or provider.
10. For every write proposal, the admin must be able to inspect the complete current record and the complete proposed record (or full content to be created/deleted), plus a clear field-level before/after view. Do not truncate field values in the review UI. Long content may use expandable or independently scrollable sections, but it must remain fully available before confirmation. Keep explicit Confirm/Discard controls.
11. Add an owner-editable assistant identity/profile section to Assistant Settings with display name, how the assistant should address the owner, response style, ongoing goals, project/personal context, and user-stated preferences/boundaries. Default the assistant display name to `Rogers` until the owner chooses another name. The profile is optional, editable, reviewable, and deletable. Do not infer and silently persist sensitive facts from transcripts; show any assistant-suggested profile changes as a proposal for confirmation.
12. Explain that this is personalization and retrieval, not model-weight training. Only the bounded profile and relevant retrieved excerpts are sent to Gemini for a request. Profile preferences remain subordinate to trusted system and security instructions.
13. Make full content accessible when needed: store all supported user/assistant text from imported conversations in searchable chunks, provide source metadata and a way to inspect a selected transcript, and let the assistant fetch complete relevant site records before proposing changes. Do not inject an entire archive or every site record into every model turn; retrieve relevant bounded context and be transparent when results are incomplete.
14. First release tool scope is the existing portfolio admin actions, read access to portfolio content, imported/saved chat search, project-file search, cited web research, scheduled read-only research reports, and general conversational help. The separate GitHub dashboard is read-only. Do not imply the agent can send email, manage a calendar, browse external files, or control other services until those integrations are specifically designed, authorized, and implemented.
15. Persist ordinary assistant conversations and messages in Supabase, with search, rename, archive, delete, and project assignment. Keep imported ChatGPT/Claude transcripts in the separate memory-source library; do not silently merge imported chats into native assistant history.
16. Provide temporary chats that are excluded from this app's saved conversation database and recent-history search. Before the first message, let the owner choose `Personalized` (may read global profile, relevant imported memory, explicitly enabled saved-chat search, and selected project context/tools but never create/update memory) or `Unpersonalized` (does not use profile, prior chats, project context/files, or optional tools). Temporary chats are read-only with respect to site actions. They can be explicitly saved as ordinary chats. Disclose that no conversation content is persisted by this app while temporary; aggregate usage accounting may still be stored, and Gemini's own processing/retention terms remain separate.
17. Projects group project-specific instructions, uploaded reference files, enabled tools, and saved chats. Project files use private Supabase Storage and searchable extracted text chunks. Support a bounded, explicit file allowlist in v1 (plain text, Markdown, and PDF); reject unsupported formats rather than silently ignoring them.
18. Tool customization is selection from an allowlist of implemented tools, not arbitrary user-provided code. The initial catalog includes site content read/search, proposed site edits, saved/imported chat-history search, project-file search, web research, and GitHub stats read-only when available. User can enable/disable tools globally and per project. No email/calendar or third-party connector is added in this release.
19. Implement web research with the currently documented Google Search grounding support for the configured Gemini model. Display real source annotations and citations from the API response; never ask the model to invent URLs. Cap searches per turn, per automation, and daily; surface the current quota/cost disclosure in Settings and fail clearly when grounding is unavailable.
20. Add scheduled automations for one-time and recurring daily/weekly research/report tasks, with timezone, destination project, explicit instructions, allowed read-only tools, enable/pause, Run now, next-run display, run status/history, and editable output prompt. Use the Vercel static Schedules path target with POST as a 15-minute due-task sweep. Protect that route with CRON_SECRET, require SUPABASE_SECRET_KEY for the isolated worker, and never make a GET route start work. User schedules remain in Supabase with a timezone-aware next_run_at; the sweep claims at most one due report per run. If either secret is missing, keep creation/enable disabled and show the exact setup requirement.
21. Automation runs are read-only in this release. Save each completed report and actual source citations to the selected project and run history. Do not send notifications to external accounts or execute proposed site writes unattended. A future external action integration must be individually connected and scoped; sending, publishing, deleting, spending, or changing external data requires the owner's review unless a narrowly scoped recurring authorization is separately designed.
22. Keep background execution bounded and durable: verify queue delivery, re-read the enabled task and current tool allowlist, enforce idempotency/no overlapping runs, respect per-task and daily AI/search budgets, retry only transient failures a bounded number of times, record safe status/error summaries, and pause a task after repeated failures. Never log prompts or full research output.

## Files likely to change

- `components/admin/AdminShell.tsx` (navigation entry)
- `app/admin/(dashboard)/assistant/page.tsx` and `components/admin/assistant/workspace/*` (saved chat, temporary chat, history, project selector, tool picker)
- `app/admin/(dashboard)/assistant/projects/[projectId]/page.tsx` and project settings components
- `app/admin/(dashboard)/assistant-memory/page.tsx` and a client-side memory manager component
- `app/admin/(dashboard)/assistant/settings/page.tsx` (global profile, custom instructions, default tools)
- `app/admin/(dashboard)/assistant/automations/page.tsx` and `components/admin/assistant/automations/*` (scheduled research task management and run history)
- `app/api/admin/agent/conversations/route.ts` (GET list/search, POST create/save-temporary)
- `app/api/admin/agent/conversations/[conversationId]/route.ts` (GET detail, POST rename/archive/delete)
- `app/api/admin/agent/projects/route.ts` and `app/api/admin/agent/projects/[projectId]/route.ts` (GET and POST project actions)
- `app/api/admin/agent/projects/[projectId]/files/route.ts`, `.../files/sign/route.ts`, and `.../files/[fileId]/route.ts` (GET/list, POST upload confirmation, signed upload, and delete)
- `app/api/admin/agent/tools/route.ts` (GET catalog/config, POST tool settings)
- `app/api/admin/agent/automations/route.ts` and `app/api/admin/agent/automations/[automationId]/route.ts` (GET/POST automation management)
- `app/api/admin/agent/automations/[automationId]/runs/route.ts` (GET run history)
- `app/api/admin/agent/automation-scheduler/route.ts` (CRON_SECRET-protected POST due-task worker)
- `app/api/admin/agent/memories/route.ts` (GET list/status only)
- `app/api/admin/agent/memories/conversation/route.ts` (GET one complete normalized transcript)
- `app/api/admin/agent/memories/import/route.ts` (POST import/upsert chunk)
- `app/api/admin/agent/memories/delete/route.ts` (POST source deletion)
- `app/api/admin/agent/profile/route.ts` (GET current profile, POST update/reset)
- `app/api/admin/agent/route.ts` and `lib/agent/tools.ts` / `lib/agent/run.ts` (profile, search tool integration, complete relevant reads, and bounded context)
- `lib/agent/proposals.ts`, `lib/agent/schemas.ts`, and `components/admin/assistant/ProposalCard.tsx` (complete action review data and UI)
- `lib/agent/memory/*` (export normalization boundary, validated types, search/storage helpers as appropriate)
- `lib/agent/research/*` and `lib/agent/automations/*` (grounding citations, schedules, bounded runs, persistence)
- `supabase/migrations/<timestamp>_personal_agent_workspace.sql` (profile, projects, project-file metadata, conversations, messages, imported-memory, automation, and automation-run tables)
- `.env.example` for GitHub, CRON_SECRET and scheduled-worker configuration
- `vercel.json` for the 15-minute POST schedule sweep
- `components/admin/assistant/AssistantDrawer.tsx` (display configured assistant name and link to workspace)
- `.env.example` only if a genuinely new environment variable is necessary (the design should not need one)
- `prompts/agent-conversation-memory.md`

## Implementation requirements

1. Read the applicable Next.js 16 documentation from `node_modules/next/dist/docs/` before writing code. Use current route-handler, caching, and client-component conventions; heed deprecations.
2. Add a responsive `/admin/assistant-memory` management page linked from the Assistant workspace/settings. It must support selecting provider, choosing a `.zip` or `.json` export, previewing detected conversation count, and then explicitly starting import. Do not parse/import merely because a file was selected.
3. Normalize ChatGPT and Claude exports defensively. Extract only ordinary user/assistant text messages and safe conversation metadata; ignore system prompts, tool payloads, attachment contents, binary data, and unsupported records. Malformed or unknown export shapes must produce a clear recoverable error, never a silent empty success.
4. Parse archives locally in the browser. Validate MIME/extension, file-size ceiling, JSON shape, per-conversation/chunk bounds, and server-side Zod schema. Do not trust client-supplied provider, timestamps, titles, identifiers, or counts without validation and normalization.
5. Create an admin-only Supabase migration for import sources, transcript chunks, and one owner profile row. Include ownership, provider/source metadata, dedupe constraints, timestamps, and a GIN full-text index. Enable RLS and policies using existing admin authorization conventions; ordinary public/anonymous clients must never read these rows. Use the signed-in Supabase client and RLS for all user-facing memory/profile operations. The only service-role exception is the isolated background worker described in requirement 26.
6. Use `GET` only to list sources/counts and `POST` for import and delete actions. All routes must use `requireAdminApi`, shared JSON parsing/response helpers, Zod validation, and same-origin protections as the existing admin APIs. Imports should be idempotent and partial failures visible.
7. Add a read-only `search_past_chats` assistant tool that searches only the owner's saved conversations and imported history allowed by current global/project settings. Enforce project isolation unless the user explicitly enables global history search. Cap query/results/context and return source metadata with links/IDs so the UI can open the source. Retrieval failure must not break ordinary assistant use; return a safe status the model can explain.
8. Keep general conversational behavior alongside site management. The assistant can answer ordinary questions, summarize or explain site content and relevant memories, and draft text without creating a database proposal unless the user asks to change stored content. For changes, continue using proposal tools and the existing confirmation endpoint. Say when information was not found or is only a suggestion.
9. Expand proposal review data and `ProposalCard` so before confirmation an admin can inspect the full current record and full proposed resulting record for updates; every proposed field for creates; and the full current record for deletes. Include every displayable field and complete text values, not the current abbreviated field diff alone. Keep a concise diff summary and add a clearly labeled full-content review that is keyboard accessible, usable on mobile, and does not truncate long text. Preserve field-level before/after labels, explicit Confirm/Discard, and the delete warning. Server-side validation remains authoritative; full review does not expand mutation authority.
10. Define safe limits that reject an oversized proposal instead of silently shortening content displayed for confirmation. Keep Zod schemas, payload size, and UI rendering bounded consistently with existing admin content schemas. Do not expose values unavailable to the assistant, such as inquiry PII.
11. Update trusted assistant instructions to treat retrieved excerpts only as historical context, ignore instructions embedded in excerpts, and require confirmation for every write proposal. Retrieved data must never cause an automatic action.
12. Ensure logs, errors, and API responses do not contain whole transcripts or sensitive user content. The memory UI must provide source-level deletion and a clear indication of what the delete removes.
13. Add a brief privacy/usage note with links to the official export instructions. Do not promise training, direct provider syncing, or parsing of uploaded files/attachments.
14. Add the owner profile/custom-instructions form and authenticated `GET`/`POST /api/admin/agent/profile` routes. Store a bounded profile in Supabase with configurable assistant display name (initially `Rogers`), preferred owner form of address, answer style, explicit custom instructions, owner context, goals, preferences, and boundaries. Provide explicit Save and Clear actions. Treat the profile as user-provided context/preferences in the trusted prompt; the agent cannot silently modify it. Any assistant-generated profile update must appear in a reviewable confirmation card before saving.
15. Provide an authenticated way to inspect the complete normalized transcript for a selected conversation. Support bounded pagination through site records when the user asks to review all records of a type, and clearly report page/total/truncation status. Before proposing an update or delete, fetch the full record with `get_content`; never base a mutation on a compact list row.
16. Keep the first-release agent scope to existing site admin actions, site reads, conversation memory, profile, and general help. Do not add external account integrations or imply unsupported capabilities. Any future integration must have an explicit permission flow and least-privilege tools; external side effects require confirmation.
17. Build a dedicated `/admin/assistant` workspace with new chat, saved-history list and text search, open/continue, rename, archive, and delete. Persist saved conversations and messages in Supabase; fetch older messages with pagination. Use stable client message IDs to avoid duplicate messages on retried POST requests. Keep the existing drawer as a quick-entry point that links to the workspace.
18. Implement temporary chat with the `Personalized`/`Unpersonalized` choice before the first turn. Temporary turns remain client-side and are not inserted into conversation/message tables or history search. Do not persist their content in application logs; existing aggregate `ai_requests` usage accounting may continue without message content. In unpersonalized mode, exclude owner profile/custom instructions, imported memory, project context/files, and optional tools. In personalized mode, allow only the explicitly selected context and configured read tools, and never create/update memories. Disable site-write proposal tools in both temporary modes. Provide `Save to history` to convert the current temporary transcript into an ordinary saved conversation. Explain that this controls this app's storage; the model provider's processing and retention follow its own terms.
19. Add projects with create/rename/archive/delete, project-specific instructions, attached saved chats, enabled-tool selection, and private reference files. Keep project instructions separate from global profile instructions; apply them only to chats in that project. Store uploads in a private Supabase Storage bucket. Reuse the signed direct-upload pattern to stay under Vercel request limits; validate type/size before issuing a signed URL, verify the object after upload, and clean up failed uploads. Support `.txt`, `.md`, and `.pdf` only, extract PDF text using the installed `unpdf` dependency, chunk/index extracted text, and allow listing, previewing, and deleting files. Never store project files in a temporary chat.
20. Add a global and per-project tool picker backed by an allowlist. Initial toggles are site content read/search, proposed site edits (saved chats only), saved/imported chat-history search, project-file search, cited web research, and GitHub stats read-only if that endpoint exists. Enforce the selected tool set on the server for every turn; client-supplied tool names are never authoritative. Do not provide arbitrary code execution or claim email/calendar access.
21. Store user profile, custom instructions, project instructions, chats, messages, project file metadata, extracted chunks, imported-memory sources, automations, and automation runs in admin-only Supabase tables with RLS. Use a private Storage bucket and admin-only object policies. Cascade or explicitly delete associated messages/files/chunks/runs when their parent is deleted, and explain destructive deletes in the UI.
22. Integrate cited web research with the Gemini version currently configured for the agent using the documented Google Search grounding API/tool surface. Inspect the installed ADK and GenAI SDK types before implementation; if ADK hides grounding annotations, use the supported low-level GenAI request path for this tool rather than inventing source links. Preserve real citation annotations/source URLs in the response contract and render linked sources next to the claims they support. If a response has no valid source annotation, do not fabricate citations or label it researched. Bound web queries/results, show a source/freshness indicator, and disclose the model/search usage and limits before enabling the tool.
23. Add a scheduled automations page and read/write API. Let the owner create, edit, pause/resume, run now, and delete one-time or daily/weekly read-only research tasks. Each task has a name, bounded instruction, local time/timezone, destination project, selected read-only tool set, next-run and last-run state, and a per-task usage cap. List run history with status, timestamps, actual sources, output/report link, and safe error summary.
24. Use the currently supported Vercel Schedules/Queues mechanism only after checking its live docs and account availability. Dynamic schedules should enqueue a POST queue-consumer run; do not create a public GET endpoint that starts/mutates jobs. Store and reconcile the provider schedule ID with the app automation row. Disable schedule creation if Vercel scheduling isn't configured for this deployment and give the owner clear setup steps.
25. The verified queue consumer must re-read the task row, confirm it's enabled and due, validate the current allowed read tools and destination project, acquire an idempotent lease, enforce concurrency and daily budgets, and record a run row before doing work. Complete reports and valid web source annotations are saved to the selected project. Avoid duplicate reports on delivery retries; retry transient failures only a bounded number of times.
26. Keep user-initiated data APIs on the signed-in Supabase client/RLS. If a background consumer cannot operate without a user session, any service-role use is server-only and confined to that verified worker, with task/project ownership and tool allowlist revalidated for each run; prefer narrow database RPCs when feasible. Never expose the service key or use it from browser-facing routes.
27. Web pages and extracted files are untrusted data: ignore instructions on pages/files, cite sources, don't run code or follow embedded links as commands, and never allow research content to authorize an action. Scheduled tasks in this release can only research/read and save reports inside this project; external account side effects require later explicit connector authorization.
28. Count manual research and each scheduled run against the existing AI usage limit and bounded per-task search budget. Record model, status, counts, and automation ID only; do not save prompts or user content in usage logs. A failed retry/fallback sequence must not create duplicate usage rows or reports.

## Security requirements

- Require authenticated admin access for the page, all memory endpoints, and search tool. Keep Supabase RLS as the data boundary.
- Keep the owner profile private under the same admin authentication and RLS rules. Validate/bound every profile field, and never treat profile preferences as permission to bypass tool access or action confirmation.
- Do not use `SUPABASE_SERVICE_ROLE_KEY` in browser-facing or user-session API routes. A background queue consumer may use a server-only service role only if necessary, after verifying the queue delivery and re-reading enabled task/project/tool configuration; never expose it to the browser or use it to bypass per-task authorization.
- Parse archives in-browser; send only validated normalized text chunks over authenticated POST requests.
- Bound archive size, conversation count, text length, batch size, search query length, returned result count, and injected context. Defend against oversized JSON, malformed ZIP entries, duplicate IDs, and request flooding with existing conventions.
- Treat every imported message as untrusted data, not instructions. Never let retrieval bypass proposal confirmation, admin authorization, schema validation, or existing action checks.
- Clearly disclose that relevant imported excerpts are included in a Gemini request when memory is used; do not include irrelevant excerpts.
- A source deletion must remove its metadata and all associated chunks; verify cascade behavior and RLS.
- Enforce conversation, project, and tool settings on the server, not just in client state. Every query and mutation must be scoped to the authenticated admin and, where applicable, the specified project/conversation.
- Temporary chat message content must not be written to application databases, logs, or history search. Explain that Gemini receives the prompt and that provider processing/retention is governed by its terms. Aggregate usage counts may be recorded without prompt content.
- Project files are private. Validate extension, MIME, and size; extract only supported text; treat extracted text as untrusted context; never execute code from files; and delete the private object plus extracted chunks on removal.
- Tool enablement is an allowlist enforced server-side. A client cannot turn on an unconfigured capability, grant a new OAuth scope, or bypass the existing confirmation route.
- Treat web search results and project file text as untrusted evidence. Render only citation URLs returned by the verified grounding response; sanitize them, use safe external-link attributes, and never infer/fabricate a citation.
- Apply explicit per-turn/per-task and daily AI/search caps. Do not run paid or quota-limited grounding outside the configured budget; report when a cap or provider limit prevented a run.

## Visual interpretation and UI expectations

- Build the workspace, project manager, profile, and memory screens inside the existing admin shell. Use the established dark palette (`#05000a` page, `#131320` cards, `#e8e6f0` text, muted grays, and `#751cff` / `#de0eff` accents), current border radii, focus rings, and type scale.
- On desktop, use an assistant workspace with a nested left panel for New chat, searchable saved history, projects, and settings; a central conversation panel; and a compact context/tools selector near the composer. Project chats show project name/instructions context. Temporary chats show a persistent, visible Temporary banner and personalization choice before the first message.
- Render web-researched answers with unobtrusive inline citations and a linked Sources section. The automations page should make each task's schedule/timezone, enabled research tools, destination project, next run, run status, and pause/run-now controls clear at a glance.
- The project screen groups instructions, attached chats, reference files, and tool toggles. Profile/custom instructions have their own settings page. Keep the memory screen focused on import disclosure, progress, source list, and full-transcript viewer.
- On mobile, collapse history/projects into an accessible drawer, keep the composer and temporary status visible, use full-width controls, and avoid horizontal page scrolling. Full proposal previews remain expandable, keyboard accessible, and scroll internally for long records while keeping Confirm/Discard visible.
- Match neighboring admin pages: roughly 16–24 px card padding, 16 px gaps, restrained accent glow, no separate visual theme, no gratuitous animation, and no overflow at 360 px or 200% zoom. Include accessible empty, loading, error, and deleted/archived states.
- Make the configured assistant name visible in the workspace and existing quick assistant drawer. The default is `Rogers`; it must update after saving a profile change.

## Acceptance criteria

1. An admin can select a ChatGPT or Claude JSON/ZIP export, preview detected conversations, explicitly import it, see progress/results, list imported sources, and delete a source.
2. Import handles duplicate/retried batches safely and reports unsupported or malformed data without claiming success.
3. No raw archive or attachment data is sent to the server; only bounded normalized text and metadata are persisted in Supabase.
4. Non-admin users cannot list, import, search, or delete memory; RLS denies direct unauthorized database reads.
5. The assistant can answer a relevant question using a retrieved excerpt and identify its source. An unrelated query returns no fabricated memory.
6. It also answers general questions and can summarize/explain relevant site content and imported memories without forcing every turn into a content mutation; it distinguishes retrieved facts from suggestions.
7. Every create/update/delete proposal exposes all complete displayable content for review before confirmation; no value is clipped or silently truncated. Updates show full current and proposed records plus a field-level diff. Confirming still writes only the revalidated proposal.
8. Prompt-injection text inside an imported transcript is handled as untrusted context and cannot execute an action or change the trusted instructions.
9. Existing assistant responses and proposal-confirmation behavior continue when no memory exists or search is unavailable.
10. `npm run typecheck`, `npm run lint`, and `npm run build` pass; the migration is syntactically valid and matches repo Supabase conventions.
11. The owner can set/edit/clear the assistant profile, configure its displayed name, and see the profile influence answer style/context after refresh. Profile updates are validated and private; imported text is never silently converted into profile facts.
12. The agent accurately describes its available tools. It handles general requests and supported site work, but does not claim it can act in email, calendar, files, or other unintegrated external services.
13. Saved chats persist across reloads, can be searched/reopened/continued/renamed/archived/deleted, and are scoped to their project when applicable. Imported history remains a separate searchable memory library.
14. Temporary chat offers personalized/unpersonalized choice before the first message, stays out of this app's database/history search, creates no memories, and disables write proposals. Saving it explicitly converts it to a saved conversation.
15. Projects can be created and managed; each has isolated instructions, saved chats, allowed tools, and private text/Markdown/PDF sources. Project-file search cites the file/source; delete removes the private file and indexed chunks.
16. The tool picker exposes only implemented capabilities and settings persist globally/per project. Server routes enforce settings and admin auth; no arbitrary code execution or unimplemented external connections are exposed.
17. Manual web research returns verified citation links and a freshness/source label, respects the configured query budget, and clearly reports when grounding or citations are unavailable.
18. An owner can create, run now, pause/resume, edit, and delete a scheduled daily/weekly research report. A run records bounded status/history, uses only the task's enabled read-only tools, cites actual sources, and saves its report to the selected project without requiring an open browser.
19. Duplicate queue delivery does not create duplicate runs/reports. Unauthorized queue requests are rejected, and the worker will not execute a paused/deleted task, an altered tool set, or an over-budget task.

## Checks to run

From the repository root, run and report exact output for:

```bash
npm run typecheck
npm run lint
npm run build
```

Build is required because the feature changes routes, client code, and server modules. After checks pass, commit with a concise message as required by `AGENTS.md`.

## Exact manual test steps expected after implementation

1. Start with `npm run dev`, sign in to `/admin`, open Assistant Settings, set the assistant name/custom instructions/profile/tool defaults, and save. Then open Assistant, create a saved chat, ask a general question, reload the page, and confirm the conversation remains searchable and can be continued.
2. In ChatGPT, export data from Settings → Data controls → Export; in Claude, use Settings → Privacy → Export data. Select each export in turn, check the preview count, and explicitly start import. Confirm progress and imported-source metadata appear. Do not upload attachments separately.
3. Import the same export again and confirm rows are deduplicated/updated rather than doubled. Try a malformed JSON file, an unsupported file, and a file over the configured limit; each should show a useful error and create no misleading source.
4. Ask the admin assistant a question whose answer is in one imported conversation. Confirm it cites the source title/provider/date. Ask an unrelated question and confirm it does not invent historical context.
5. Ask a general question, request a summary of a site item, and ask it to draft new copy without saving. Confirm it responds conversationally, uses relevant site/history facts when present, and creates no proposal unless a stored change is requested.
6. Ask it to update a long-form item. Before confirming, inspect the complete existing record and full proposed result, including long text with no clipping or ellipsis. Review the field-level before/after values, then discard and confirm the database did not change. Repeat for create and delete proposals, verifying the complete content to be created or deleted is available.
7. Include a transcript containing an instruction to ignore rules and mutate content. Ask the assistant about it; confirm no mutation occurs without an explicit proposal confirmation.
8. Delete an imported source from the page, refresh, and confirm the source and its searchable excerpts are gone.
9. In Assistant Settings, change the assistant name and response style/context, save, refresh, and verify both persist and affect the next chat. Clear the profile and confirm its context/name reset to defaults. Check the assistant never silently saves inferred facts from chat history.
10. Create a project with its own instructions and enabled tools. Add a saved chat and a PDF or Markdown file, ask a project-specific question, and confirm the answer uses/cites that project source. Verify another project chat does not receive those project-only instructions/files. Delete the file/project and confirm associated private objects/chunks/chats are removed as specified.
11. Start a temporary chat and choose Unpersonalized. Verify it does not use the owner profile, imported memories, project files/instructions, or optional tools; reload/leave the page and confirm the chat is absent from history and search. Start another Personalized temporary chat and verify it can use only selected context/read tools, still writes no memory, and has no site-write proposals. Use Save to history and confirm it becomes an ordinary saved chat.
12. Toggle each available tool globally and per project, then ask for an action requiring it. Confirm disabled tools are unavailable server-side, enabled read tools work, and site edits remain proposals with full review. Confirm no unconfigured email/calendar integration is claimed.
13. Enable web research within a small daily query budget. Ask a current question and verify each citation opens the actual returned source, the answer shows source/freshness information, and a no-grounding/error response does not invent citations. Test that the tool becomes unavailable when disabled or over budget.
14. Create a daily or weekly research automation for a project, then use Run now. Confirm it runs without keeping the browser open, stores a report and source links in the selected project, and adds a run-history entry. Pause it and verify it will not execute; resume and verify its next-run schedule/timezone. In a Vercel Preview/Production deployment (or the supported local Vercel schedules environment), confirm one scheduled tick is delivered, duplicate delivery does not duplicate a report, and over-budget/failed tasks are safely recorded/paused. If the Vercel account/project lacks Schedules/Queues support, verify the UI reports the exact setup requirement and keeps tasks disabled.
15. With the signed-in admin access token, verify conversation, project, file, tool configuration, research, automation, profile, and memory endpoint behavior:

```bash
curl -sS "http://localhost:3000/api/admin/agent/profile" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile":{"displayName":"Rogers","ownerPreferredName":"Mohammed","responseStyle":"Concise, clear, and practical","customInstructions":"Use simple language and give actionable next steps.","ownerContext":"I build web apps with Next.js and Supabase.","goals":["Grow my portfolio"],"preferences":["Show full proposed content before saving"],"boundaries":["Ask before sending external messages"]}}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clear":true}'

curl -sS "http://localhost:3000/api/admin/agent/conversations?q=portfolio" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Portfolio planning","projectId":null}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"save_temporary","title":"Portfolio scratchpad","projectId":null,"messages":[{"role":"user","text":"Help me outline a portfolio update"},{"role":"assistant","text":"Here is a draft outline."}]}'

curl -sS "http://localhost:3000/api/admin/agent/conversations/<CONVERSATION_UUID>" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/conversations/<CONVERSATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"rename","title":"Portfolio updates"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/conversations/<CONVERSATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"archive"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/conversations/<CONVERSATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"saved","conversationId":"<CONVERSATION_UUID>","message":"Summarize this project for me"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"temporary","personalization":"unpersonalized","messages":[{"role":"user","text":"Help me outline a portfolio update"}]}'

curl -sS "http://localhost:3000/api/admin/agent/projects" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Portfolio Refresh","instructions":"Focus on clear, concise portfolio copy.","enabledTools":["site_read","project_files"]}'

curl -sS "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"update","name":"Portfolio Refresh","instructions":"Use the project's reference files.","enabledTools":["site_read","project_files"]}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete"}'

curl -sS "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>/files" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>/files/sign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"sample-project-notes.pdf","contentType":"application/pdf","size":12345}'

# Copy the returned signedUrl and path into these values, upload the file, then confirm it.
curl -sS -X PUT "$SIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary "@./sample-project-notes.pdf"

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"<SIGNED_PATH>","fileName":"sample-project-notes.pdf"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/projects/<PROJECT_UUID>/files/<FILE_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete"}'

curl -sS "http://localhost:3000/api/admin/agent/tools?projectId=<PROJECT_UUID>" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/tools" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<PROJECT_UUID>","enabledTools":["site_read","history_search","project_files"]}'

curl -sS -X POST "http://localhost:3000/api/admin/agent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"saved","conversationId":"<CONVERSATION_UUID>","message":"Research the latest Next.js release and summarize it with verified sources."}'

curl -sS "http://localhost:3000/api/admin/agent/automations" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/automations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Weekly framework research","instructions":"Research recent primary-source updates to Next.js and save a concise report with citations.","projectId":"<PROJECT_UUID>","enabledTools":["web_research","project_files"],"schedule":{"kind":"recurring","frequency":"weekly","dayOfWeek":1,"localTime":"09:00","timezone":"Africa/Monrovia"},"maxSearchesPerRun":3,"enabled":false}'

curl -sS "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>" \
  -H "Authorization: Bearer $TOKEN"

curl -sS "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>/runs?limit=10" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"resume"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"run_now"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"pause"}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/automations/<AUTOMATION_UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete"}'

curl -sS "http://localhost:3000/api/admin/agent/memories" \
  -H "Authorization: Bearer $TOKEN"

curl -sS "http://localhost:3000/api/admin/agent/memories/conversation?conversationId=<CONVERSATION_UUID>" \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST "http://localhost:3000/api/admin/agent/memories/import" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"chatgpt","sourceName":"Manual smoke test","batchKey":"manual-001","conversations":[{"externalId":"manual-conv-1","title":"Example conversation","createdAt":"2026-01-01T00:00:00.000Z","content":"user: I prefer short project updates.\nassistant: I will keep project updates concise."}]}'

curl -sS -X POST "http://localhost:3000/api/admin/agent/memories/delete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"<SOURCE_UUID_FROM_LIST>"}'
```

The import handler may add fields to support idempotency, but update this prompt and final instructions to match the implemented request schema exactly. GET is read-only; import and deletion are POST actions.
