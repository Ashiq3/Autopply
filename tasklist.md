# Autopply — Daily Engineering Tasklist

Incremental, production-focused improvements for **Autopply** (`Ashiq3/Autopply`).  
**Rule:** Complete 1 focused task per scheduled run to keep changes clean, atomic, and meaningful.

## Documentation & Repo Hygiene
- [x] Add `CHANGELOG.md` following Keep a Changelog format for version tracking (2026-11-24)
- [ ] Add `SECURITY.md` with responsible vulnerability disclosure and API key safety guidelines
- [ ] Add `docs/architecture.md` documenting the `server.ts` API endpoints and `src/App.tsx` frontend flow
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
