# HR Agent Assist

An AI-powered, channel-agnostic HR assistant that delivers cited, accurate, role-aware HR guidance grounded in your company's own documents and employment law.

<img width="706" height="541" alt="HR Agent Assist" src="https://github.com/user-attachments/assets/b6e4e645-1d2b-4369-92c5-91d00c38fae5" />

## Features

**Role-aware responses** — tell it whether you're an Employee, Manager, or HR Professional and it adjusts the depth and framing of every answer accordingly.

**Knowledge base (RAG)** — upload your company's policy documents (PDF, DOCX, ODT, TXT, MD, HTML, CSV) and HR Agent Assist will cite them in every relevant answer.

**Streaming AI chat** — real-time responses with full conversation history, searchable across all sessions.

**Three-brains architecture** — Company Policy Brain (RAG), Legal Baseline Brain (government sources), and Tools Brain (actions with audit logging).

**Intent routing** — automatically classifies each question as Policy Q, Legal Baseline Q, Action Request, Personal Case, or Unknown.

**Three-tier memory** — session memory, case memory (persistent per case), and organizational memory (admin-curated).

**Dark & light mode** — theme follows system preference, manually toggleable.

**Session-based auth** — register/login with username + password, PostgreSQL-backed sessions.

**OpenAI-compatible API** — `POST /api/chat/completions` for external integrations (Slack, Teams, email).

**Keyboard shortcuts** — `Ctrl+Enter` to send, `↑`/`↓` to navigate sent message history.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Tailwind CSS, Shadcn UI, Wouter, TanStack Query |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL (via Drizzle ORM) |
| AI | OpenAI-compatible provider (configurable, defaults to OpenCode Go) |
| Document parsing | pdf-parse, Mammoth, JSZip |
| Search | PostgreSQL full-text search (ts_rank) |
| Streaming | Server-Sent Events (SSE) |
| Auth | express-session (PG store in production, memory in dev) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- LLM API key (OpenCode Go, OpenAI, OpenRouter, Groq, or custom)

### Install & run

```bash
npm install
npm run db:push
cp .env.example .env   # then fill in your DATABASE_URL and LLM_* vars
npm run dev
```

The app runs on `http://localhost:5000` by default.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hr_care

# LLM Provider (swappable — opencode_go | openai | openrouter | groq | custom)
LLM_PROVIDER=opencode_go
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://opencode.ai/zen/go/v1
LLM_MODEL=deepseek-v4-pro
LLM_MODEL_FALLBACKS=deepseek-v4-flash,qwen3.5-plus
LLM_TIMEOUT_MS=30000
LLM_MAX_TOKENS=4096

# Auth (optional — only enforced when API_KEY is set)
API_KEY=

# Session
SESSION_SECRET=change-me-in-production

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5000,http://localhost:5173
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (username + password, SHA-256 hashed) |
| POST | `/api/auth/login` | Login, sets session cookie |
| POST | `/api/auth/logout` | Destroys session |
| GET | `/api/auth/me` | Returns current user (requires session) |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations (requires auth) |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/:id` | Get conversation with messages |
| PATCH | `/api/conversations/:id` | Update title or session data |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/conversations/:id/messages` | Send message (SSE streaming) |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List knowledge base documents |
| POST | `/api/documents/upload` | Upload documents (multipart, up to 20 files) |
| DELETE | `/api/documents/:id` | Delete document |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with provider/model info |
| GET | `/api/models` | List available models |
| POST | `/api/chat/completions` | OpenAI-compatible completions endpoint (requires `API_KEY`) |

---

## Project Structure

```
hr-care-agent/
├── client/                  # React frontend
│   └── src/
│       ├── components/     # UI components (sidebar, role-selector, etc.)
│       ├── hooks/          # use-auth (auth context + hydration)
│       ├── lib/            # queryClient, utils
│       └── pages/          # home, chat, about, knowledge-base, login, register
├── server/
│   ├── ai/
│   │   ├── provider.ts     # AI provider interface
│   │   ├── openai-compatible.ts  # OpenAI-compatible streaming provider
│   │   └── registry.ts     # Env-driven provider config
│   ├── auth.ts             # requireApiKey, requireSession middleware
│   ├── session.ts          # Session middleware (PG + memory stores)
│   ├── routes.ts           # All API routes
│   ├── storage.ts          # Drizzle storage layer
│   └── docParser.ts        # PDF/DOCX/ODT/TXT/MD/HTML/CSV parser
├── shared/
│   └── schema.ts           # Drizzle schema (users, conversations, messages, documents, documentChunks)
└── migrations/
    └── 0000_initial_schema.sql
```

---

## Roles

| Role | What it focuses on |
|------|---------------------|
| Employee | Your rights, entitlements, leave, benefits, how to navigate HR processes |
| Manager | Employee rights + your compliance obligations, documentation requirements, legal risks |
| HR Professional | Full statutory detail, regulatory citations, edge cases, audit considerations |

---

## Roadmap

- [ ] Slack — bot integration via Bolt SDK, slash commands, DMs
- [ ] Email — inbound parsing and reply via SendGrid / Postmark
- [ ] Telegram — bot API
- [ ] Microsoft Teams — Azure Bot Framework
- [ ] WhatsApp — Meta Cloud API
- [ ] Embeddable widget — iframe / script tag for existing HR portals
- [ ] Admin panel — configure jurisdictions, escalation contacts, document access controls
- [ ] Conversation export — PDF and Markdown
- [ ] Audit log viewer — for HR staff
- [ ] Multi-tenant support — separate knowledge bases per organization

---

## About the Creator

Built by **Evan G. Zellner**, MSHRM, PHR, SHRM-CP — a strategic HR professional and full-cycle recruiter with 6+ years of experience across technical recruiting, HR business partnering, and talent acquisition strategy.

[LinkedIn](https://linkedin.com/in/evanzellner)

---

*HR Agent Assist provides general guidance only. Always verify critical matters with your HR department or qualified legal counsel.*