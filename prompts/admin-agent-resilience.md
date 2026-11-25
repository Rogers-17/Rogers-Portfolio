# Admin Assistant request reliability continuation

## Goal

Continue Claude's unfinished reliability changes for the existing Google ADK + Gemini admin assistant. Bound a chat turn so it cannot hang indefinitely, retry transient Gemini failures on the configured fallback model, and show a useful timeout error in the existing chat UI. Keep daily AI usage accounting consistent: one assistant request/turn must create at most one `ai_requests` row even when the fallback model is attempted.

The agent must continue to propose changes only. A person must explicitly confirm each proposal before any database mutation.

## Skills and guidance read

- `AGENTS.md`: prompt approval before code, Next.js guide requirement, POST for mutations, Supabase source of truth, required checks, manual test steps, and commit rule.
- No user-named or repository-specific implementation skill applies to this backend reliability task.
- `prompts/admin-agent-adk.md`: original assistant implementation decisions, security requirements, current behavior, and manual verification guidance.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`: Route Handler request and abort signal context.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`: existing ADK server package loading guidance.
- Installed `@google/adk@2.5.0` TypeScript declarations for `LlmAgent`, `Runner`, and forwarded `generateContentConfig`.
- Google's current Gemini model documentation: `gemini-3.5-flash-lite` is listed as a stable Flash-Lite model and its standard tier includes free usage.
- Current local implementation and package versions.

## Existing code inspected

- Current uncommitted diffs in `components/admin/assistant/AssistantDrawer.tsx`, `lib/admin/client.ts`, and `lib/agent/run.ts`.
- `lib/agent/run.ts`: lazy ADK loading, Gemini configuration, model error mapping, event handling, quota checks, timeout/fallback work, and request logging.
- `app/api/admin/agent/route.ts`: admin auth, request parsing, `request.signal` forwarding, and the 60-second route duration.
- `app/api/admin/agent/confirm/route.ts`, `lib/agent/proposals.ts`, and existing proposal flow: confirmation remains the only write path.
- `lib/admin/client.ts` and `components/admin/assistant/AssistantDrawer.tsx`: client fetch error mapping, request abort behavior, and existing retry/error UI.
- `lib/resume/queries.ts`: `aiRequestsToday` counts rows in `ai_requests`; this table is shared with other AI features.
- `lib/ai/openrouter.ts`: shared `AiError` and existing AI usage conventions.
- `package.json`, `.env.example`, and the original assistant prompt for available commands and configuration.

## Decisions and assumptions

1. The three current modified files contain Claude's in-progress work and are part of this task. Preserve and finish those changes; do not reset or overwrite them.
2. Keep `GEMINI_MODEL` as the preferred model. Use the documented stable free-tier `gemini-3.5-flash-lite` as the fallback candidate so fallback does not depend on an undocumented alias.
3. Treat 429, overload/5xx, and a per-call timeout as retryable when the overall turn deadline leaves enough time. Do not retry authentication/configuration errors. A fallback success must return the model that produced the result.
4. The deadline must cover the assistant request end-to-end closely enough to stay within the route's 60-second limit, including the quota/preflight work that can be bounded safely. Keep a margin for the route response.
5. Log no more than one `ai_requests` row per user chat turn after the attempt sequence settles. A fallback attempt is part of the same turn, not another unit of daily usage. Keep the returned usage count consistent with the persisted count.
6. Keep logs free of user prompt text, proposal values, credentials, and API keys. No schema or migration change is expected.
7. Preserve the current drawer and its visual language. This task does not request a visual redesign.

## Files likely to change

- `lib/agent/run.ts`
- `lib/admin/client.ts`
- `components/admin/assistant/AssistantDrawer.tsx`
- `app/api/admin/agent/route.ts` only if needed to make request cancellation/deadline handling correct.
- `prompts/admin-agent-resilience.md` (this implementation prompt).

## Implementation requirements

1. Review the in-progress diff and finish its timeout/fallback behavior without discarding unrelated existing work.
2. Give each agent turn a total deadline below the route's `maxDuration = 60` seconds. Propagate cancellation to the ADK runner, stop waiting on calls when the deadline expires, and leave enough time to return a structured API error.
3. Configure a bounded per-model call so the SDK's internal retry/backoff cannot consume the entire route window. Use the installed ADK/GenAI type surface rather than relying on unsupported options.
4. Attempt the configured preferred model first, then the fallback only for retryable failures and only when sufficient deadline remains. Avoid duplicate attempts when both model IDs are equal.
5. Reuse the same validated messages and read-only/proposal tools on fallback. Do not confirm or execute a proposal as part of retry. No model-generated output may write directly to Supabase.
6. Record one usage row at most for the turn, including terminal failures. Keep the recorded model, success state, token fields where available, and returned usage value coherent with the attempt sequence. A failed preferred attempt followed by a successful fallback must not consume two daily usage units.
7. Make abort/timeout failures resolve to the existing structured `AiError` response. Make the browser fetch helper distinguish timeout/abort from an ordinary network failure, and ensure the drawer clears its loading state and exposes Retry.
8. Preserve admin authentication, request schema validation, same-origin behavior, server-only `GEMINI_API_KEY`, error-message privacy, prompt-history bounds, proposal confirmation, Supabase RLS, and existing actions.
9. Do not add a database migration, new AI provider, new test framework, or test-specific production endpoint.

## Security requirements

- `GEMINI_API_KEY` stays server-only and is never placed in response payloads, logs, or client code.
- Both agent routes continue to require admin authentication; all mutations remain behind the existing explicit confirm endpoint.
- Continue using the signed-in Supabase client and existing RLS/action validation. Do not use a service-role key.
- Do not log message bodies, inquiry data, proposals, or other user content when reporting model errors.
- A timed-out or retried model call must not bypass proposal confirmation or allow a late response to execute a write.

## Acceptance criteria

1. A normal authenticated chat turn still returns the assistant reply/proposals and the model used.
2. If the preferred model returns a retryable 429/overload/5xx or times out, the fallback is attempted only when the total deadline allows it; a fallback success is returned normally.
3. Authentication/configuration failures do not trigger fallback. If all permitted attempts fail, the route returns a structured, user-safe AI error before the route duration expires.
4. A user turn that uses both preferred and fallback models creates at most one `ai_requests` row and increments the returned daily usage by one, not two. A terminal failure also creates at most one row.
5. Aborting or timing out a browser request stops the loading state and shows the existing retry affordance with a clear timeout message.
6. Successful write proposals still require a separate explicit confirmation; timeout/retry does not mutate content.
7. No new migration is needed, and the changes pass `npm run typecheck`, `npm run lint`, and `npm run build`.

## Checks to run

From the project root, run and report the exact output of:

```bash
npm run typecheck
npm run lint
npm run build
```

The build is required because the assistant route and server execution path are involved. After the checks pass, commit the completed reliability change with a concise commit message, as required by `AGENTS.md`.

## Exact manual test steps to share after implementation

1. Set `GEMINI_API_KEY` in `.env.local`, start the app with `npm run dev`, sign in to `/admin`, open Assistant, and ask: `List my unpublished projects`. Confirm a normal response appears and the loading indicator clears.
2. To exercise fallback, submit a read-only request when the preferred model receives a transient 429/5xx or per-call timeout. Verify the fallback answer is returned, Supabase has at most one `ai_requests` row for that turn, and the drawer usage increases by one when logging succeeds. A transient provider response may be needed to exercise this path; do not use a nonexistent model ID because model-not-found is a permanent configuration error and should not be retried.
3. With a valid preferred model, submit a normal request and confirm that one usage row is added for the turn.
4. To verify terminal errors, first temporarily set `GEMINI_MODEL=not-a-real-gemini-model`, restart the dev server, and submit a chat turn; verify model-not-found is returned without trying the fallback. Then temporarily use an invalid `GEMINI_API_KEY` and submit a turn; verify the UI exits loading, shows an authentication error, and does not retry the fallback. Restore the valid model and key.
5. Ask for a content change that returns a proposal. Discard it and verify the database is unchanged. Request another change, confirm it, and verify the existing confirm flow applies it.
6. Optional authenticated API smoke check, using the signed-in Supabase access token:

```bash
curl -s -X POST http://localhost:3000/api/admin/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","text":"List my unpublished projects"}]}'
```

The route remains `POST`; no status route is required.
