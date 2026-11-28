# Autopply — Daily Engineering Tasklist

Incremental, production-focused improvements for **Autopply** (`Ashiq3/Autopply`).  
**Rule:** Complete 1–2 focused tasks per run, selected by estimated effort and current backlog state to keep changes clean, atomic, and meaningful.

## Documentation & Repo Hygiene
- [x] Add `CHANGELOG.md` following Keep a Changelog format for version tracking (2026-11-24)
- [x] Add `SECURITY.md` with responsible vulnerability disclosure and API key safety guidelines (2026-11-26)
- [x] Add `docs/architecture.md` documenting the `server.ts` API endpoints and `src/App.tsx` frontend flow (2026-11-28)
- [ ] Add `.github/ISSUE_TEMPLATE/bug_report.md` and feature request template
- [ ] Add `.github/PULL_REQUEST_TEMPLATE.md` with a concise PR verification checklist
- [ ] Review and document all environment variables in `.env.example` with clear comments

## Code Quality & Modularization
- [ ] Audit `tsconfig.json` and add/verify strict TypeScript compiler checks where safe
- [ ] Extract shared API response types from `server.ts` into `src/types.ts`
- [ ] Add a clean `/api/health` status endpoint (or document existing health check) in `server.ts`
- [ ] Add JSDoc comments to key helper functions in `src/utils/`
- [ ] Review `index.html` metadata (title, description, Open Graph tags) for polished sharing previews
- [ ] Add a lightweight GitHub Actions CI workflow (`.github/workflows/typecheck.yml`) to run TypeScript type-checking on push/PR


## Expanded Engineering Backlog — AUTO-013 to AUTO-040

The original checklist above is preserved. These additional tasks are deliberately small enough for one focused engineering session. Done means the change is implemented, checked, and documented where appropriate.

### Reliability, validation & automated tests
- [ ] **AUTO-013 — Add a repeatable TypeScript test runner.** Add a test command and minimal runner configuration that works with the existing Bun lockfile and TypeScript setup. **Done when:** a clean install can run the test command in CI and one sample test passes.
- [ ] **AUTO-014 — Extract CV file classification into a pure helper.** Centralize extension/MIME checks used by src/utils/cvUpload.ts. **Done when:** supported PDF, DOCX, TXT/MD and unsupported types have explicit outcomes.
- [ ] **AUTO-015 — Test CV file classification edge cases.** Cover empty names, uppercase extensions, misleading extensions, MIME mismatches and unsupported formats. **Done when:** tests run without a browser or real resume files.
- [ ] **AUTO-016 — Validate AI-parsed CV data before profile updates.** Check string, number and array fields before merging the parsed response into UserProfile. **Done when:** malformed or partial responses preserve existing profile values and cannot inject invalid field types.
- [ ] **AUTO-017 — Add CV upload failure-path tests.** Cover empty files, parser errors, non-JSON responses and unsuccessful API responses. **Done when:** failures return useful errors and leave the current profile unchanged.
- [ ] **AUTO-018 — Add request timeouts and cancellation to agentFetch.** Support an AbortSignal or a safe default timeout for long-running AI calls. **Done when:** timed-out requests fail with a distinguishable error and callers can cancel work.
- [ ] **AUTO-019 — Harden LLM response parsing.** Handle invalid JSON, empty bodies and unexpected content types in provider/API responses. **Done when:** callers receive a predictable typed error instead of an unhandled parsing exception.
- [ ] **AUTO-020 — Test credential masking and storage behavior.** Cover short keys, long keys, custom providers, disabled persistence and removal. **Done when:** raw secrets never appear in UI-facing masked values or test output.
- [ ] **AUTO-021 — Audit custom LLM base URL handling.** Trace how custom base URLs travel from the browser to server.ts; define safe protocol, host and redirect rules. **Done when:** unsafe local/private network targets cannot be reached from server-side provider requests, or the limitation is clearly enforced and documented.
- [ ] **AUTO-022 — Enforce CV upload limits on the server.** Validate request size, allowed MIME types and supported file extensions before parsing. **Done when:** oversized and unsupported uploads receive a consistent 4xx response.
- [ ] **AUTO-023 — Add structured API error codes.** Standardize client-safe codes for validation, provider, timeout and unexpected failures. **Done when:** frontend error handling can distinguish expected failure classes without exposing secrets or stack traces.
- [ ] **AUTO-024 — Add a server configuration validation helper.** Check required production settings at startup while allowing documented local/demo settings. **Done when:** missing production configuration produces a clear actionable message and no secret value is logged.
- [ ] **AUTO-025 — Add a build, lint and test CI workflow.** Use the repository's existing lockfile/package manager consistently. **Done when:** pull requests run install, type-check/lint, tests and production build.
- [ ] **AUTO-026 — Add a dependency security audit workflow.** Run a repeatable dependency audit on pull requests and a scheduled maintenance run. **Done when:** audit output is visible in Actions and documented severity handling is clear.

### Job discovery & application workflow
- [ ] **AUTO-027 — Create a canonical job identity helper.** Normalize source URL, company and title for duplicate detection. **Done when:** tracking parameters and trivial title/case differences do not create duplicate identities.
- [ ] **AUTO-028 — Test job deduplication and merge rules.** Cover missing URLs, tracking parameters, same-title different-company cases and repeated imports. **Done when:** tests prove unrelated jobs are not merged.
- [ ] **AUTO-029 — Validate external job URLs before navigation.** Allow safe HTTP(S) destinations and reject malformed or dangerous schemes. **Done when:** UI links cannot trigger javascript:, data: or other unsafe navigation.
- [ ] **AUTO-030 — Bound ATS compatibility scores.** Validate overall and component scores before rendering or saving them. **Done when:** all displayed scores are finite numbers within 0–100 and malformed values use a safe fallback.
- [ ] **AUTO-031 — Document application status transitions.** Define allowed moves between discovered, company-found, tailored, mapped, applied, failed and skipped. **Done when:** the transition rules are documented and invalid transitions are rejected by the relevant helper.
- [ ] **AUTO-032 — Add tracker status transition tests.** Cover valid moves, invalid moves, repeated updates and terminal states. **Done when:** tests lock down the intended workflow.
- [ ] **AUTO-033 — Version browser-persisted application data.** Add a schema version and migration/fallback path for saved profiles, alerts and application history. **Done when:** older or malformed stored data does not crash the app or silently erase recoverable data.
- [ ] **AUTO-034 — Add storage corruption and quota tests.** Exercise invalid JSON, unavailable localStorage and quota errors using a mocked storage adapter. **Done when:** default state remains usable and the user receives a non-sensitive warning where needed.

### UX, accessibility & release quality
- [ ] **AUTO-035 — Audit accessible labels in profile and CV forms.** Ensure each input has a programmatic label and validation messages are associated with their fields. **Done when:** keyboard and screen-reader users can identify controls and errors.
- [ ] **AUTO-036 — Improve modal keyboard behavior.** Add or verify Escape handling, focus trapping and focus restoration for dialogs. **Done when:** a keyboard-only walkthrough can open, use and close each major dialog.
- [ ] **AUTO-037 — Add loading, empty and error states to job discovery.** Make the three states visually distinct and actionable. **Done when:** no search state leaves a blank or indefinitely confusing panel.
- [ ] **AUTO-038 — Add a responsive UI smoke-test checklist.** Document the critical pages and viewport sizes to verify manually. **Done when:** the checklist covers dashboard, search, profile, settings and application tracker.
- [ ] **AUTO-039 — Add privacy-safe fixtures for automated tests.** Create synthetic CV, job and profile fixtures with no real personal data. **Done when:** all tests and examples use fabricated identities and clearly fake contact details.
- [ ] **AUTO-040 — Add a release verification checklist.** Document versioning, environment checks, build result, smoke tests and rollback notes. **Done when:** a release can be checked consistently without exposing provider credentials.
