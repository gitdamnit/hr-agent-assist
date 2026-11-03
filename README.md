# HR Agent Assist

[![CI](https://github.com/gitdamnit/hr-agent-assist/actions/workflows/ci.yml/badge.svg)](https://github.com/gitdamnit/hr-agent-assist/actions/workflows/ci.yml)

<img width="200" height="200" alt="HR Agent Assist logo" src="hragentassistlogo.jpeg" />

**An AI HR assistant that answers from your company's own policy documents — with citations, role-aware depth, and an honest escalation path.**

<img width="706" height="541" alt="HR Agent Assist chat" src="https://github.com/user-attachments/assets/b6e4e645-1d2b-4369-92c5-91d00c38fae5" />

---

## Why this exists

Employees, managers and HR staff ask the same policy questions over and over. A
general chatbot answers them confidently and cites nothing, which is worse than
useless in an HR context. HR Agent Assist retrieves the relevant passages from
documents you upload, shows where the answer came from, and changes the depth of
the answer depending on who is asking.

It is a **finished prototype**, not a compliance product. The scope is locked and
documented below, including what it deliberately does not do.

## What it does

- **Role-aware answers** — Employee, Manager and HR Professional each get different depth, obligations and framing.
- **Grounded retrieval (RAG)** — upload PDF, DOCX, ODT, MD, TXT, HTML, CSV or RTF; chunks are ranked with PostgreSQL full-text search and injected into the prompt with their source document name.
- **Streaming chat** — SSE responses, persisted conversation history, auto-titling.
- **Real per-user isolation** — every conversation is owned by a user; another user gets `404`, not someone else's data.
- **Session auth** — register/login/logout with hashed passwords and server-side sessions.
- **OpenAI-compatible API** — `POST /api/chat/completions` (bearer `API_KEY`) for Slack/Teams/email integrations.
- **One-command deployment** — Docker Compose brings up the app and PostgreSQL, with a `/api/health` check.
- **Keyboard shortcuts** — Enter/Ctrl+Enter to send, Shift+Enter for a new line, ↑/↓ for message history.

## What it deliberately does not do

These were considered and excluded from v1.0. They are not "coming soon" — they
are out of scope, and the README will not pretend otherwise.

| Not built | Why it was excluded |
| --- | --- |
| Slack / Teams / Telegram / WhatsApp / email channels | Each is an integration project; the OpenAI-compatible endpoint is the seam they would use. |
| Tool execution (open ticket, create document, route to HR) | Real safety and audit surface. The system prompt describes the behaviour; the code does not execute actions. |
| Case memory and organisation memory | Needs retention policy and admin curation; not appropriate for a prototype. |
| Admin console, SSO, multi-tenancy | A permissions product on its own. |
| Vector embeddings | Deliberate choice of transparent keyword retrieval ([D-0001](DECISION_LOG.md)). |
| Legal advice | The product gives cited general guidance and escalates high-risk topics. |

## Architecture

```
Browser (React + Vite)
   │  session cookie
   ▼
Express 5 ── /api/auth          session auth (Postgres store in prod)
   ├──────── /api/conversations conversation CRUD, ownership enforced
   ├──────── /api/documents     upload → extract → chunk → index
   ├──────── /api/search        ts_rank over document_chunks
   ├──────── /api/conversations/:id/messages   SSE streaming
   └──────── /api/chat/completions             OpenAI-compatible, API key
          │
          ▼
   AIProvider interface ── OpenAI-compatible HTTP/SSE
          │                 (OpenCode Go · OpenAI · OpenRouter · Groq · custom)
          ▼
   PostgreSQL 16 (Drizzle ORM)
     users · conversations · messages · documents · document_chunks
```

Request flow for a question: authenticate → load the conversation and its role →
retrieve the top five matching chunks → build a role-aware system prompt with
citations → stream the model response → persist both messages → auto-title the
conversation on the first exchange.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Decisions and
rejected alternatives: [`DECISION_LOG.md`](DECISION_LOG.md).

## Quick start

### Docker (app + database)

```bash
cp .env.example .env    # set LLM_API_KEY, SESSION_SECRET, and DB_PASSWORD
docker compose up --build
```

Open <http://localhost:5000>, register, then upload a policy document on the
Knowledge Base page before asking a question.

### Local development

```bash
npm install
cp .env.example .env    # set DATABASE_URL and LLM_* variables
npm run db:push
npm run dev             # http://localhost:5000
```

`GET /api/health` reports the active provider and model, and still answers `200`
with `llm: "unconfigured"` when no API key is present.

## Tests

```bash
npm test        # 19 integration tests, no database required
npm run check   # TypeScript
npm run build   # client + server bundle
```

The tests import the real `registerRoutes` and drive it with an in-memory
`IStorage` and a fake provider, so they fail when the shipped handlers change
behaviour. They cover auth, per-user conversation isolation, streaming and
persistence, knowledge-base search, health reporting and the OpenAI-compatible
endpoint.

## API

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Status, provider and model |
| POST | `/api/auth/register` | — | Create account, start session |
| POST | `/api/auth/login` | — | Log in |
| POST | `/api/auth/logout` | session | Destroy session |
| GET | `/api/auth/me` | session | Current user |
| GET | `/api/conversations` | session | List **your** conversations |
| POST | `/api/conversations` | session | Create conversation |
| GET | `/api/conversations/:id` | session | Conversation with messages (owner only) |
| PATCH | `/api/conversations/:id` | session | Rename / update session data |
| DELETE | `/api/conversations/:id` | session | Delete |
| POST | `/api/conversations/:id/messages` | session | Send message (SSE stream) |
| GET | `/api/documents` | session | List knowledge-base documents |
| POST | `/api/documents/upload` | session | Upload up to 20 files |
| DELETE | `/api/documents/:id` | session | Delete a document |
| GET | `/api/search?q=` | session | Ranked chunks with source titles |
| GET | `/api/models` | — | Models exposed by the configured provider |
| POST | `/api/chat/completions` | `API_KEY` | OpenAI-compatible completion (streaming or not) |

## Project structure

```
hr-agent-assist/
├── client/src/            React app (pages, components, auth hook)
├── server/
│   ├── ai/                provider interface, OpenAI-compatible client, registry
│   ├── routes.ts          all HTTP routes (dependency-injectable for tests)
│   ├── storage.ts         Drizzle-backed IStorage
│   ├── auth.ts            requireSession / requireApiKey
│   ├── session.ts         session middleware (PG + memory stores)
│   ├── docParser.ts       PDF / DOCX / ODT / text extraction
│   └── api.test.ts        integration tests against the real routes
├── shared/schema.ts       Drizzle schema and types
├── migrations/            initial schema + conversation ownership
├── Dockerfile             multi-stage production image
└── docker-compose.yml     app + PostgreSQL
```

## Status

**v1.0.0 — scope locked.** This repository is a portfolio prototype and is not
under active feature development. Correctness fixes and documentation changes are
welcome; new channels or capabilities would be a separate project.

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what is verified and
[`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md) for the acceptance criteria.

## About the creator

Built by **Evan G. Zellner, MSHRM, PHR, SHRM-CP** — a strategic HR professional and
full-cycle recruiter with 6+ years across technical recruiting, HR business
partnering and talent acquisition.

[LinkedIn](https://linkedin.com/in/evanzellner) · [GitHub](https://github.com/gitdamnit)

---

*HR Agent Assist provides general guidance only. Verify critical matters with your
HR department or qualified legal counsel.*
