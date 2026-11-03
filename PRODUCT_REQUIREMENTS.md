# Product Requirements

## Project Identity

**Name:** HR Agent Assist
**Repository:** https://github.com/gitdamnit/hr-agent-assist
**Licence:** MIT
**Maintainer:** Evan G. Zellner ([@gitdamnit](https://github.com/gitdamnit))

## Purpose

Employees, managers and HR staff ask the same policy questions repeatedly, and
generic chatbots answer them confidently without evidence. HR Agent Assist answers
from the organisation's own uploaded policy documents, cites the source of every
claim, adjusts depth by role, and escalates high-risk topics instead of guessing.

The project exists as a working, inspectable prototype: it demonstrates the
retrieval, prompting, auth and deployment patterns needed for a real HR assistant,
without pretending to be a compliance product.

## Intended Users

- **Employees** — want to understand entitlements and process in plain language.
- **Managers** — need the employee view plus their own obligations and documentation steps.
- **HR professionals** — need statutory detail, edge cases and escalation paths.
- **Developers/reviewers** — evaluate the architecture, tests and tradeoffs.

## Functional Requirements

| ID | Requirement | Acceptance signal |
| --- | --- | --- |
| FR-1 | A visitor can register and log in with username and password. | Session cookie set; `GET /api/auth/me` returns the user. |
| FR-2 | Every conversation belongs to exactly one user. | A second user receives `404` for another user's conversation. |
| FR-3 | A user can create, list, rename and delete their own conversations. | CRUD routes return the expected records and status codes. |
| FR-4 | Each conversation records a role (employee, manager, HR professional). | Role is persisted in `conversations.session_data.role`. |
| FR-5 | A user can upload policy documents (PDF, DOCX, ODT, MD, TXT, HTML, CSV, RTF). | Upload returns per-file `status: ok` and a chunk count. |
| FR-6 | Uploaded documents are chunked and indexed in PostgreSQL full-text search. | `GET /api/search?q=` returns matching chunks with document titles. |
| FR-7 | Chat answers stream token by token and are persisted. | SSE response ends with `done: true`; both messages are stored. |
| FR-8 | Retrieved chunks are injected into the system prompt with source names. | The provider receives a system prompt containing the document title. |
| FR-9 | An OpenAI-compatible endpoint serves external integrations. | `POST /api/chat/completions` returns an OpenAI-shaped response. |
| FR-10 | The service reports health without requiring the LLM to be configured. | `GET /api/health` returns `200` and `llm: "unconfigured"` when no key is set. |

## Nonfunctional Requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-1 | Conversation data is isolated per authenticated user. | No cross-user read or write path; enforced by query predicates. |
| NFR-2 | Secrets never ship in the repository. | Only `.env.example` is tracked; `.env` is gitignored. |
| NFR-3 | The app runs from a single container plus PostgreSQL. | `docker compose up --build` reaches a healthy state. |
| NFR-4 | Password handling is not plaintext. | SHA-256 hash stored; cleartext never persisted. |
| NFR-5 | LLM provider is swappable without code changes. | `LLM_PROVIDER` selects OpenAI-compatible base URL and model. |
| NFR-6 | Tests exercise the real route handlers. | `server/api.test.ts` imports `registerRoutes`. |

## Scope and Exclusions

**In scope for v1.0:** role-aware RAG chat, citations in the prompt, streaming,
per-user conversation history, session auth, knowledge-base upload and search,
OpenAI-compatible API, Docker deployment, integration tests.

**Out of scope for v1.0:** anything not listed above.

## Technical Constraints

- Node.js 18+ (Docker image uses Node 20), TypeScript, Express 5.
- PostgreSQL 16 with Drizzle ORM; no other datastore.
- React + Vite frontend served by the same Express process in production.
- Any OpenAI-compatible LLM endpoint; no provider SDK lock-in.

## Acceptance Criteria

v1.0 is complete when, at the release commit:

1. `npm run check`, `npm test` and `npm run build` pass.
2. The Docker image builds and `GET /api/health` answers inside the container.
3. Every functional requirement above has an automated test or a recorded manual check.
4. The README claims nothing that the code does not do.

## Release Objectives

Ship a scope-locked v1.0.0 that can be showcased as a finished prototype: honest
documentation, green tests against real handlers, working container, and a clear
statement of what was intentionally left out.
