# HR Agent Assist

An AI-powered, channel-agnostic HR assistant. React frontend, Express backend, PostgreSQL database, OpenAI via AI Integrations.

## Architecture

- **Frontend**: React + Wouter routing + TanStack Query + Shadcn UI + Tailwind CSS
- **Backend**: Express.js with SSE streaming for AI responses
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: OpenAI gpt-5.2 via AI Integrations (no user API key required)
- **Document Parsing**: pdf-parse (PDF), mammoth (DOCX), jszip (ODT), native (TXT/MD/HTML)

## Pages

- `/` – Home page with feature overview and CTA
- `/chat/:id` – Chat interface with streaming AI responses, role-aware suggestions
- `/knowledge-base` – Document upload and management (PDF, DOCX, ODT, TXT, MD, HTML, CSV)
- `/about` – About the Creator page with credentials
- `/` – Home page

## Key Features

### Role Selector
Every new conversation starts with a role picker (Employee / Manager / HR Professional).
- Employee: rights, entitlements, how to navigate processes
- Manager: employee rights + manager obligations, compliance responsibilities
- HR Professional: full statutory detail, edge cases, compliance, risk flags

### Knowledge Base (RAG)
Upload company policy documents → they are parsed, chunked, and indexed in PostgreSQL full-text search. Every message query searches the knowledge base and injects relevant chunks into the AI system prompt with citations.

### AI Chat (Streaming SSE)
Full streaming responses using gpt-5.2 with the HR Agent Assist system prompt. Role-aware, knowledge-base-aware.

### Conversation Management
All conversations persisted in PostgreSQL, auto-titled, listed in sidebar with delete.

### Dark/Light Mode

## API Routes

- `GET /api/conversations` – list all
- `POST /api/conversations` – create (with optional sessionData.role)
- `GET /api/conversations/:id` – get with messages
- `PATCH /api/conversations/:id` – update title/sessionData
- `DELETE /api/conversations/:id` – delete
- `POST /api/conversations/:id/messages` – send message, SSE streaming response
- `GET /api/documents` – list documents
- `POST /api/documents/upload` – multipart upload (PDF/DOCX/ODT/TXT/MD/HTML/CSV)
- `DELETE /api/documents/:id` – delete document

## Database Schema

- `conversations` – id, title, session_data (jsonb: role, jurisdiction), created_at, updated_at
- `messages` – id, conversation_id, role, content, metadata (jsonb), created_at
- `documents` – id, title, filename, file_type, file_size, chunk_count, created_at
- `document_chunks` – id, document_id, chunk_index, content, created_at (FTS indexed)

## Environment Variables

- `DATABASE_URL` – PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` – Provided by AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` – Provided by AI Integrations

## Roadmap

### Channel Integrations (next phase ~1 week total)
- **Slack** — bot integration via Bolt SDK, slash commands, DMs (~1–2 days)
- **Email** — inbound email parsing and reply via SendGrid/Postmark (~1 day)
- **Telegram** — bot API, simple to implement (~half day)
- **Microsoft Teams** — Azure Bot Framework, app manifest (~2–3 days)
- **WhatsApp** — Meta Cloud API, requires business account approval (~2–3 days)
- **Embeddable web widget** — iframe/script tag for third-party portals (~few hours)

### Static Documentation Export
- Generate a static documentation site or Markdown file from knowledge base documents and conversation insights

### Additional Features
- Admin configuration panel (configure jurisdictions, escalation contacts, templates)
- Conversation export (PDF, Markdown)
- Jurisdiction tagging on uploaded documents
- HR-only document access controls (audience tagging per doc)
- Audit log viewer for HR staff
- Multi-tenant / organization support
