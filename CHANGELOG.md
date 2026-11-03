# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-02

Scope locked. This release makes the implementation and the documentation agree.

### Added

- `GET /api/health` — reports status, version, provider and model, and stays
  healthy with `llm: "unconfigured"` when no key is set.
- `GET /api/search?q=` — ranked knowledge-base chunks with their source titles.
- Per-user conversation ownership (`conversations.user_id`) with a migration;
  a second user now receives `404` instead of another user's data.
- Message-history keyboard navigation (↑/↓) and Ctrl/Cmd+Enter to send.
- `docs/ARCHITECTURE.md` — components, request flow, data model, limits.
- `PRODUCT_REQUIREMENTS.md`, `DECISION_LOG.md`, `PROJECT_STATUS.md`.

### Changed

- README rewritten around verified behaviour, with an explicit "not built, on
  purpose" scope instead of an open-ended roadmap.
- `registerRoutes` accepts optional `storage` and `getProvider` dependencies so
  tests can run the real handlers.
- All conversation, document and search routes require a session; the
  OpenAI-compatible endpoint keeps its separate `API_KEY`.

### Fixed

- Removed a duplicate, unauthenticated `GET /api/conversations` registration that
  shadowed the protected one and exposed every user's conversations.
- Removed the health payload that had been pasted into the conversations route;
  the Docker/compose healthcheck now hits a route that exists.
- Replaced the test suite, which re-implemented every route locally and could not
  fail, with 19 integration tests against the shipped handlers.
- Corrected the project-structure path and the stale Docker "known issue"; the
  image builds and the health endpoint answers.

### Removed

- The multi-channel/admin roadmap list, case and organisation memory claims, and
  the "three brains / intent routing" architecture claims. The prompt still
  guides answer structure, but the code no longer pretends those subsystems exist.

## [0.9.0] - 2025-05-13

Pre-release build: role-aware RAG chat, streaming responses, document upload and
chunking, session auth, Docker configuration, and the OpenAI-compatible endpoint.
