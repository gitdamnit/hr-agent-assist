HR CARE — HR Compliance and Rights Engine

An AI-powered, channel-agnostic HR assistant that delivers cited, accurate, role-aware HR guidance grounded in your company's own documents and employment law.


<img width="706" height="541" alt="image" src="https://github.com/user-attachments/assets/b6e4e645-1d2b-4369-92c5-91d00c38fae5" />


What It Does
HR CARE gives employees, managers, and HR professionals instant access to reliable HR guidance — the kind of detailed, policy-grounded answers that usually require a meeting with HR.


<img width="713" height="533" alt="image" src="https://github.com/user-attachments/assets/9998c818-4a6f-4e79-9f6d-737ad49172c9" />



Role-aware responses — tell it whether you're an Employee, Manager, or HR Professional and it adjusts the depth and framing of every answer accordingly

Knowledge base (RAG) — upload your company's policy documents and HR CARE will cite them in every relevant answer

Streaming AI chat — real-time responses powered by GPT-5.2

Full conversation history — every conversation is saved and searchable

Dark & light mode

Built to be channel-agnostic — Slack, Teams, email, and WhatsApp integrations are on the roadmap
Roles
Role	What HR CARE focuses on
Employee	Your rights, entitlements, leave, benefits, how to navigate HR processes
Manager	Employee rights + your compliance obligations, documentation requirements, legal risks
HR Professional	Full statutory detail, regulatory citations, edge cases, audit considerations

Knowledge Base
Upload any combination of:

*** PDF — handbooks, policy documents, offer letter templates *** UNABLE TO PARSE PDFs ** NEED TO FIX

DOCX / DOC — Word documents
ODT — OpenDocument format
TXT, Markdown, HTML, CSV — plain files
Documents are parsed, chunked, and indexed. Every question searches the knowledge base and injects the most relevant excerpts into the AI's context. Answers cite the document by name.

<img width="707" height="540" alt="image" src="https://github.com/user-attachments/assets/0b8bd494-54aa-442c-91da-7f5603a52267" />


<img width="705" height="541" alt="image" src="https://github.com/user-attachments/assets/881b65c4-5a37-43b3-8a1e-cd3c36080bab" />

Tech Stack
Layer	Technology

Frontend	React, Tailwind CSS, Shadcn UI

Routing	Wouter

Data fetching	TanStack Query

Backend	Node.js, Express

Database	PostgreSQL (via Drizzle ORM)

AI	OpenAI GPT-5.2 (Replit AI Integrations)

Document parsing	pdf-parse, Mammoth, JSZip

Search	PostgreSQL full-text search

Streaming	Server-Sent Events (SSE)

Getting Started

Prerequisites

Node.js 18+

PostgreSQL database

OpenAI API key (or Replit AI Integrations)

Install & run
npm install
npm run db:push
npm run dev
The app runs on http://localhost:5000 by default.

##Manager inquires... 
<img width="851" height="1034" alt="image" src="https://github.com/user-attachments/assets/c83e6bd4-ed03-486a-9213-1c984aa2c9b2" />

Environment variables

Variable	Description

DATABASE_URL	PostgreSQL connection string

AI_INTEGRATIONS_OPENAI_API_KEY	OpenAI API key

AI_INTEGRATIONS_OPENAI_BASE_URL	OpenAI base URL

SESSION_SECRET	Session signing secret

API Reference

Method	Endpoint	Description

GET	/api/conversations	List all conversations

POST	/api/conversations	Create a new conversation

GET	/api/conversations/:id	Get a conversation with messages

PATCH	/api/conversations/:id	Update title or session data

DELETE	/api/conversations/:id	Delete a conversation

POST	/api/conversations/:id/messages	Send a message (SSE streaming)

GET	/api/documents	List knowledge base documents

POST	/api/documents/upload	Upload a document

DELETE	/api/documents/:id	Delete a document

##Employee inquires... 
<img width="751" height="961" alt="image" src="https://github.com/user-attachments/assets/10957f8a-45aa-4d54-8fd8-a08a0d2abe33" />

Roadmap
Slack — bot integration via Bolt SDK, slash commands, DMs

Email — inbound parsing and reply via SendGrid / Postmark

Telegram — bot API

Microsoft Teams — Azure Bot Framework

WhatsApp — Meta Cloud API

Embeddable widget — iframe / script tag for existing HR portals

Admin panel — configure jurisdictions, escalation contacts, document access controls

Conversation export — PDF and Markdown

Audit log viewer — for HR staff

Multi-tenant support — separate knowledge bases per organization

About the Creator

Built by Evan G. Zellner, MSHRM, PHR, SHRM-CP — a strategic HR professional and full-cycle recruiter with 6+ years of experience across 
technical recruiting, HR business partnering, and talent acquisition strategy.

#Finally, HR inquires...
<img width="851" height="1362" alt="image" src="https://github.com/user-attachments/assets/df02110c-4200-49e7-812a-1f6623c32c52" />

## :)
<img width="888" height="970" alt="image" src="https://github.com/user-attachments/assets/26be6700-2bdb-4b82-855f-837fd4322a48" />

Disclaimer
HR CARE provides general guidance only. Always verify critical matters with your HR department or qualified legal counsel.
