# Decision Log

## How to Use This Log

1. Copy the block below to the end of the `## Decisions` section.
2. Use the next free four-digit ID. IDs are never reused and never renumbered.
3. Date the record the day the decision was actually made (`YYYY-MM-DD`).
4. Record the alternatives you rejected and why. A decision without context is a
   rumour, not a record.
5. Never rewrite history. If a decision changes, append a superseding record.

```markdown
### D-NNNN — Short imperative title

- **Date:** YYYY-MM-DD
- **Status:** Accepted
- **Context:** the situation and the constraint that forced a choice
- **Alternatives Considered:** option A (rejected because ...), option B (rejected because ...)
- **Decision:** what was decided, in one or two sentences
- **Rationale:** why this option wins, including what it costs
- **Consequences:** what follows from it — new constraints, follow-up work, risks
- **Supersedes:** None
```

Allowed statuses: `Proposed`, `Accepted`, `Superseded`, `Deprecated`, `Rejected`.

## Decisions

### D-0001 — Use PostgreSQL full-text search instead of vector embeddings

- **Date:** 2026-03-22
- **Status:** Accepted
- **Context:** Policy documents must be retrievable with citations, on a single Postgres instance, without an embedding pipeline or a second datastore.
- **Alternatives Considered:** `pgvector` embeddings (rejected: extra dependency, embedding cost, non-deterministic results during development), hosted vector database (rejected: second service to run and pay for).
- **Decision:** Chunk documents and rank with `tsvector`/`ts_rank` using `plainto_tsquery`.
- **Rationale:** Zero additional infrastructure, inspectable results, and exact keyword matches are easy to explain to a reviewer. Costs recall on paraphrased questions.
- **Consequences:** Retrieval quality depends on wording; adding embeddings later would be a new decision and a schema change.
- **Supersedes:** None

### D-0002 — Talk to any OpenAI-compatible endpoint, not a provider SDK

- **Date:** 2026-05-13
- **Status:** Accepted
- **Context:** The prototype must run against OpenCode Go, OpenAI, OpenRouter, Groq or a local gateway without code edits.
- **Alternatives Considered:** Provider-specific SDKs (rejected: four integrations, lock-in), LangChain-style abstraction (rejected: heavy dependency for one chat call).
- **Decision:** One `AIProvider` interface with an OpenAI-compatible HTTP/SSE implementation, configured by `LLM_PROVIDER`, `LLM_BASE_URL` and `LLM_MODEL`.
- **Rationale:** Every target provider speaks the same wire format; the abstraction is small enough to read in one sitting.
- **Consequences:** Provider-specific features (tool calling formats, native streaming quirks) are not modelled.
- **Supersedes:** None

### D-0003 — Session cookies for browser auth, API key for integrations

- **Date:** 2026-05-13
- **Status:** Accepted
- **Context:** A browser app needs revocable login; external systems need a machine credential.
- **Alternatives Considered:** JWT access tokens (rejected: revocation and refresh complexity), OAuth/OIDC (rejected: out of scope for a single-tenant prototype).
- **Decision:** `express-session` with a PostgreSQL store in production and an in-memory store in development; `POST /api/chat/completions` is separately protected by an optional `API_KEY` bearer token.
- **Rationale:** Server-side sessions are revocable and simple; the API key keeps integrations independent of browser cookies.
- **Consequences:** Horizontal scaling requires a shared session store, which the Postgres store already provides.
- **Supersedes:** None

### D-0004 — Scope conversations to a single user, not an organisation

- **Date:** 2026-11-02
- **Status:** Accepted
- **Context:** The original schema had no owner column, so every authenticated user could read every conversation.
- **Alternatives Considered:** Shared team workspace (rejected: needs roles and invite management).
- **Decision:** `conversations.user_id` is non-null and every conversation query filters on the session user.
- **Rationale:** Makes the existing "session-based auth" claim true without building a permissions model.
- **Consequences:** Existing unowned rows are removed by `migrations/0001_conversation_ownership.sql`; sharing conversations would need a new decision.
- **Supersedes:** None

### D-0005 — Test the real route handlers with injected storage

- **Date:** 2026-11-02
- **Status:** Accepted
- **Context:** The original suite re-implemented every route inside the test file, so it passed regardless of application behaviour.
- **Alternatives Considered:** Test against a live PostgreSQL instance (rejected: slow, stateful, CI credentials), keep the mock app (rejected: proves nothing).
- **Decision:** `registerRoutes` accepts optional `storage` and `getProvider` dependencies; tests inject an in-memory `IStorage` and a fake provider.
- **Rationale:** Tests now fail when the shipped handler changes behaviour, and still run in under two seconds with no services.
- **Consequences:** `registerRoutes` carries a small dependency-injection seam that production ignores.
- **Supersedes:** None

### D-0006 — Serve the client from the API process in one container

- **Date:** 2026-05-13
- **Status:** Accepted
- **Context:** Deployment should be one image plus Postgres for a demo that anyone can run.
- **Alternatives Considered:** Separate static host and API (rejected: two deploy targets, CORS surface), serverless functions (rejected: SSE and session state).
- **Decision:** Vite builds the client into `dist/public`; Express serves it and the API on port 5000 with a `/api/health` healthcheck.
- **Rationale:** One `docker compose up` yields a working system; no CDN or reverse proxy required.
- **Consequences:** Static assets are served by Node; a CDN would be an infrastructure change later.
- **Supersedes:** None
