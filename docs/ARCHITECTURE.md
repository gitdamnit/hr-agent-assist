# Architecture

## Components

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Client | React 18, Vite, Wouter, TanStack Query, Tailwind/Shadcn | Role selection, chat UI, knowledge-base upload, auth screens |
| HTTP | Express 5 | Session handling, CORS, rate limiting, routing |
| Sessions | `express-session` + `connect-pg-simple` | Revocable browser sessions (memory store in development) |
| Storage | Drizzle ORM over PostgreSQL 16 | Users, conversations, messages, documents, chunks |
| Retrieval | PostgreSQL `tsvector` / `ts_rank` | Ranked policy excerpts with source titles |
| AI | `AIProvider` → OpenAI-compatible HTTP/SSE | Streaming completions from any compatible endpoint |
| Packaging | Multi-stage Dockerfile + Compose | One app container plus PostgreSQL |

## Request flow: asking a question

1. `POST /api/conversations/:id/messages` passes through `requireSession`.
2. The conversation is loaded with both `id` and `user_id`; a mismatch returns `404`.
3. The user's message is saved.
4. `storage.searchChunks(content, 5)` ranks policy chunks with `ts_rank`.
5. `buildSystemPrompt(role, knowledgeContext, modelInfo)` composes the role
   instructions, citations rules, retrieved excerpts and escalation guidance.
6. The provider streams tokens; each delta is written as an SSE `data:` event.
7. The full assistant message is saved with model/provider metadata.
8. A conversation still titled "New Conversation" is renamed from the first question.

If retrieval finds nothing, the prompt explicitly tells the model to say
"Not found in current company documents" rather than invent policy.

## Data model

```
users (id, username, password)
  └─ conversations (id, user_id → users.id, title, session_data, timestamps)
       └─ messages (id, conversation_id → conversations.id, role, content, metadata)

documents (id, title, filename, file_type, file_size, chunk_count)
  └─ document_chunks (id, document_id → documents.id, chunk_index, content)
```

`conversations.user_id` is non-null; every conversation query filters on it.
Deleting a user cascades to their conversations, and deleting a conversation
cascades to its messages. `messages.metadata` carries citations, model and
provider information.

## Authentication

- **Browser:** username/password (SHA-256 hash) → session cookie `hr_sid`
  (`httpOnly`, `sameSite=strict` in production). The session store is PostgreSQL
  in production and memory in development.
- **Integrations:** `POST /api/chat/completions` uses `Authorization: Bearer
  <API_KEY>`. When `API_KEY` is unset, the endpoint is open — documented, and
  intended only for local use.

## Deployment

`docker compose up --build` starts:

- `app` — Node 20 image, non-root user, healthcheck `GET /api/health`, port 5000.
- `db` — PostgreSQL 16 with `migrations/` mounted at
  `/docker-entrypoint-initdb.d`, applied once on a fresh volume.

The client is built into `dist/public` and served by Express, so there is no
separate static host or CORS origin to configure.

## Testing

`server/api.test.ts` imports `registerRoutes` and injects:

- an in-memory `IStorage` implementation,
- a fake `AIProvider` that yields deterministic tokens.

The tests therefore exercise the shipped handlers, middleware and status codes
without a database or network call. `GET /api/health` is also verified with a
provider that throws, to prove the server stays healthy when the LLM is
unconfigured.

## Deliberate limitations

- Retrieval is keyword-based; paraphrased questions may miss relevant policy.
- One process serves the client and the API; static assets are not on a CDN.
- No background jobs, queues or retries beyond provider fallbacks.
- No audit log, tool execution or multi-tenant permissions.
