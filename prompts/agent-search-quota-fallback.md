# Admin Assistant: keep chatting when Google Search grounding is rate-limited

## Goal

The admin Assistant currently fails every turn with "Gemini's free tier limit was reached" even though plain Gemini calls succeed. Make a turn degrade gracefully: if a model call fails with HTTP 429 while the Google Search tool is attached, retry the same turn once without the search tool, so normal chat and site management keep working. Web research comes back on its own once Google's search quota allows it.

## Skills and guidance read

- `AGENTS.md`: prompt approval before code, required checks, manual test steps, commit rule.
- `prompts/admin-agent-adk.md` and `prompts/admin-agent-resilience.md`: original ADK design, the turn deadline, fallback model order, and the one `ai_requests` row per turn rule.
- `prompts/agent-conversation-memory.md`: why the `web_research` tool exists and its "cite real sources only" rule.
- No Next.js API surface changes (no route, config, or rendering change), so no additional `node_modules/next/dist/docs` guide applies beyond what earlier prompts already used.

## Diagnosis (verified live on 2026-11-25)

- Supabase: the `agent_*` tables now exist (`agent_profiles`, `agent_conversations` return 200), so the earlier "missing migration" failure is resolved.
- Direct Gemini REST probes with the project's `GEMINI_API_KEY`:
  - `gemini-flash-latest` (default model): 503 "high demand".
  - `gemini-3.5-flash-lite` (fallback), plain prompt: 200.
  - `gemini-3.5-flash-lite` with a function declaration only: 200 (returns a `functionCall`).
  - `gemini-3.5-flash-lite` with function declaration **plus** `googleSearch`: **429 RESOURCE_EXHAUSTED**.
  - `gemini-flash-lite-latest` with `googleSearch`: **429**.
- `web_research` is enabled by default (`app/api/admin/agent/route.ts` default tools, profile defaults), so `lib/agent/tools.ts` attaches `adk.GoogleSearchTool` to every turn. Every attempt, including the fallback, therefore hits the search-grounding quota and the turn fails with `ai_busy` 429.

## Existing code inspected

- `lib/agent/run.ts`: `config()`, `attempt()`, `runAgentTurn()` model loop, `mapModelError()`, `isTransient()`, deadline constants, logging.
- `lib/agent/tools.ts`: `buildTools()` adds `GoogleSearchTool` when `enabled.has("web_research")`.
- `app/api/admin/agent/route.ts`: computes `enabledTools` from profile ∩ project and passes them to `runAgentTurn`.
- `app/api/admin/agent/automations/route.ts` and `lib/agent/automations.ts`: scheduled research also calls `runAgentTurn` (it will get the same fallback; a research report without search should say search was unavailable rather than invent sources).
- `lib/ai/openrouter.ts`: `AiError(status, code, message)`; 429 maps to `status 429, code "ai_busy"`.

## Decisions and assumptions

1. Change only `lib/agent/run.ts`. No schema, route, UI, or env changes.
2. A 429 from an attempt that had `web_research` enabled is treated as a probable search-grounding quota hit. Google returns the same 429 body for model RPM and search quota, so they can't be told apart reliably. Retrying once without search is cheap (429s return fast) and harmless if it was really model RPM: the retry also gets 429 and the user sees the same error as today.
3. Retry order inside one turn: for each model in `[primary, fallback]`, run with the turn's tools. On a 429 with search attached, set `searchDisabled = true` and retry the **same model** without search before moving to the next model. Once search is dropped, it stays dropped for the rest of the turn.
4. Remember the search outage per server instance: a module-level `searchCooldownUntil` timestamp (10 minutes). While it's active, turns start without search, so they don't waste time on a known 429. Serverless instances may lose this state, which is acceptable.
5. When search is dropped, add one line to the system instruction: web search is temporarily unavailable; if the owner asks for current or external information, say so, and never invent sources or URLs. Return no citations for that turn.
6. All existing bounds stay: 50 s turn deadline, `MIN_TIME_FOR_FALLBACK_MS` check before any extra attempt, `MAX_LLM_CALLS`, and **one** `ai_requests` row per turn whatever the number of attempts.
7. Keep the default model `gemini-flash-latest` (configurable via `GEMINI_MODEL`). Its 503s already fall through to `gemini-3.5-flash-lite`. Mention in the summary that setting `GEMINI_MODEL=gemini-3.5-flash-lite` avoids the wasted first attempt while the default model is overloaded.

## Files likely to change

- `lib/agent/run.ts`

## Implementation requirements

- Thread a `withoutSearch: boolean` into `attempt()`. When true, pass `enabledTools.filter(tool => tool !== "web_research")` to `buildTools` and append the "web search unavailable" line to `instruction()`.
- In `runAgentTurn`, replace the simple model loop with an attempt list that can insert one "same model, no search" retry after a 429 when search was attached. Respect the deadline guard before every extra attempt.
- Keep the rule that only transient errors (`ai_busy`, `ai_timeout`) move on to the next attempt; auth, model-not-found, and generic errors still stop at once.
- Set `searchCooldownUntil = Date.now() + 10 * 60_000` when the no-search retry is triggered; check it at the start of each turn.
- Log a server warning without user text, for example `[agent] search grounding rate-limited; retrying <model> without web search`.
- No change to `AgentReply` shape; `citations` is empty when search was not used.

## Security requirements

- No new data leaves the server; logs contain model names and status codes only (no prompts, keys, or proposal values).
- Proposal-only writes are unchanged: dropping search does not change which `propose_*` tools are available or the confirm flow.
- Read-only temporary chats stay read-only.
- The model must still never invent URLs or citations.

## Acceptance criteria

- With the current key (search quota exhausted), sending "List my projects" in the Assistant returns a real answer (listing projects via `list_content`) instead of the 429 error.
- Asking "What's the latest Next.js version?" returns an answer saying web search is temporarily unavailable, with no invented citations.
- Proposals (for example "Change the tagline of project X to Y") still produce a confirmation card, and Confirm still saves.
- Exactly one new `ai_requests` row (action `agent`) per turn.
- If Gemini is truly rate-limited for all calls, the user still sees the existing "free tier limit" message (no hang, under 60 s).
- `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` is not required (no route or config change), but run it if the lint or typecheck output suggests module issues.

## Manual test steps (to share after implementation)

1. `npm run dev`, sign in to `/admin`.
2. Open `/admin/assistant` (or press Ctrl/Cmd+K on any admin page) and send `List my projects`. Expect a list of your real projects.
3. Send `What is the latest Next.js version?`. Expect a reply saying web search is unavailable right now, with no source links.
4. Send `Change the tagline of <one of your projects> to "Test tagline"`. Expect a change card; click Discard (or Confirm and revert afterwards).
5. Dev-server terminal: expect one `[agent] search grounding rate-limited…` warning on the first turn, and none for the next 10 minutes.
6. Optional API check from the browser devtools console while signed in:
   ```js
   await fetch("/api/admin/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text: "List my projects" }] }) }).then(r => r.json())
   ```
   Expect `{ reply, proposals: [], usage, citations: [] }` with HTTP 200.
