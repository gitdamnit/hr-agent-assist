# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed
- Docker image build — Vite client build now resolves correctly inside the container (`npm run build` in the builder stage); image builds and passes `GET /api/health`
- README project-structure path and Docker usage instructions

## [1.0.0] - 2025-05-13

### Added
- Initial release of HR Agent Assist
- **Auth**: Session-based register/login with PostgreSQL-backed sessions
- **Role-aware AI responses**: Employee, Manager, HR Professional modes
- **Knowledge base (RAG)**: Upload PDF, DOCX, ODT, TXT, MD, HTML, CSV — cited in every answer
- **Streaming chat**: Real-time SSE responses with full conversation history
- **Three-brains architecture**: Company Policy Brain, Legal Baseline Brain, Tools Brain
- **Intent routing**: Classifies questions as Policy Q, Legal Baseline Q, Action Request, Personal Case, or Unknown
- **Three-tier memory**: Session, case (persistent), and organizational memory
- **Dark/light mode**: System preference with manual toggle
- **OpenAI-compatible API**: `POST /api/chat/completions` for external integrations
- **Keyboard shortcuts**: `Ctrl+Enter` to send, `↑`/`↓` for message history
- **Health endpoint**: Shows active provider and model info

### Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Wouter, TanStack Query
- Backend: Node.js, Express 5
- Database: PostgreSQL (Drizzle ORM)
- AI: OpenAI-compatible provider (configurable, defaults to OpenCode Go)
- Document parsing: pdf-parse, Mammoth, JSZip
- Auth: express-session with PG store

### Known Issues
- None outstanding. The Docker build issue noted in an earlier revision of this file is resolved (see `[Unreleased]`).