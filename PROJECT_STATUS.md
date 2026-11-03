# Project Status

## Current Phase

Released

## Repository State

<!-- Machine-maintained by `prodoc update`. Do not hand-edit. -->
<!-- prodoc:observed:start -->
<!-- Observed from Git metadata only, by `prodoc update`. This block is not evidence that the implementation or its tests are correct; record that under `## Verification Evidence`. -->
- **Observed branch:** -
- **Observed commit:** -
- **Observed working tree:** unknown
- **Observed at:** -
<!-- prodoc:observed:end -->

## Verification Evidence

- **Verification:** commit `e4ba160` — `npm test` green, 19/19 integration tests against the real route handlers — evidence: test output in this session
- **Verification:** commit `e4ba160` — `npm run check` (TypeScript) completed with no errors — evidence: command output
- **Verification:** commit `e4ba160` — `npm run build` produced `dist/public` and `dist/index.cjs` — evidence: build output
- **Verification:** commit `e4ba160` — Docker image built successfully (exit 0) — evidence: `/tmp/opencode/docker-final.log`
- **Verification:** commit `e4ba160` — running container answered `GET /api/health` with `200` — evidence: `curl` output

## Completed Work

- [Implemented] Role-aware system prompt for employee, manager and HR professional — `server/routes.ts`
- [Implemented] Document upload, text extraction and chunking for PDF, DOCX, ODT, MD, TXT, HTML, CSV, RTF — `server/docParser.ts`
- [Implemented] PostgreSQL full-text retrieval with cited source titles — `server/storage.ts`
- [Implemented] SSE streaming chat with persisted history and auto-titling — `server/routes.ts`
- [Implemented] Session auth with per-user conversation ownership — `server/auth.ts`, `shared/schema.ts`, `migrations/0001_conversation_ownership.sql`
- [Implemented] OpenAI-compatible `POST /api/chat/completions` — `server/routes.ts`
- [Implemented] `GET /api/health` and `GET /api/search` — `server/routes.ts`
- [Implemented] Dockerfile and Compose deployment with healthcheck — `Dockerfile`, `docker-compose.yml`
- [Tested] 19 integration tests importing the real `registerRoutes` — `server/api.test.ts`
- [Removed] Unauthenticated duplicate conversation route and dead health payload — `server/routes.ts`
- [Removed] Stale multi-channel roadmap and unimplemented architecture claims — `README.md`, `CHANGELOG.md`

## Tests

| Suite | Command | Result | Evidence |
| --- | --- | --- | --- |
| Integration | `npm test` | Pass (19) | `server/api.test.ts` |
| Type check | `npm run check` | Pass | command output |
| Build | `npm run build` | Pass | `dist/` |
| Container | `docker build` + `curl /api/health` | Pass (see verification) | `/tmp/opencode/docker-final.log` |
| Manual | Browser walkthrough of register → upload → chat | Not run in this session | - |

## Known Defects

- **Password hashing is unsalted SHA-256** (`server/routes.ts`). Acceptable for a
  prototype; a production system needs Argon2/bcrypt with per-user salts.
- **`POST /api/chat/completions` is open when `API_KEY` is unset.** Intentional
  for local development, documented in the README, but must be set in deployment.
- **Retrieval is keyword-only.** Paraphrased questions can miss relevant policy;
  recorded as a deliberate tradeoff in `DECISION_LOG.md` (D-0001).

## Blockers

None. The project is closed for v1.0.

## Next Actions

1. Nothing required for release.
2. If the project is ever reopened, the first item would be password hashing
   (Argon2) — recorded above as a known defect, not a roadmap promise.

## Release Status

v1.0.0, ready to publish. GitHub release/tag is created outside this repository.
