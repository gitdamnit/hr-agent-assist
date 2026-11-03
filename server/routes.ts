import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { extractTextFromFile, chunkText } from "./docParser";
import { getAIProvider } from "./ai/registry";
import { requireApiKey, requireSession, type SessionUser } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import type { Message } from "@shared/schema";

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const ROLE_CONTEXT: Record<string, string> = {
  employee: `
CURRENT USER ROLE: Employee
Tailor your response for an employee who wants to understand their own rights, entitlements, and how to navigate HR processes. Use plain language. Explain what the employee is entitled to, how to request it, and what to expect. Avoid jargon. Be reassuring but accurate.`,
  manager: `
CURRENT USER ROLE: Manager
Tailor your response for a manager who needs to understand both the employee's perspective AND their own managerial obligations. Cover: what the employee is entitled to, what the manager must do (legally and per policy), any documentation or approval steps required, and what discretion (if any) the manager has. Be thorough about compliance responsibilities.`,
  hr_professional: `
CURRENT USER ROLE: HR Professional
Tailor your response for an HR professional who needs the full compliance picture. Include: precise statutory/regulatory references, policy implementation details, edge cases, documentation requirements, record retention obligations, risk flags, and recommended escalation paths. Use professional HR terminology. Do not oversimplify.`,
};

const THREE_BRAINS = `
SYSTEM ARCHITECTURE — You operate with three "brains":

A) COMPANY POLICY BRAIN (RAG — primary):
Grounded in uploaded company documents. Each answer must cite: document title, section/heading or page, and link/ID when available. Distinguish clearly between company policy and legal minimums. If no relevant document is found, say "Not found in current company documents" and propose next steps.

B) LEGAL BASELINE BRAIN (government sources — secondary):
Used for jurisdiction-specific legal minimums. Prefer authoritative sources: federal/state labor departments, OSHA/EEOC equivalents, official statutes/regulations portals. Include publication/updated date. Clearly distinguish law vs company policy. Recommend HR/legal review for high-risk topics.

C) TOOLS BRAIN (actions):
When a request involves creating a document, opening a ticket, routing to HR, or scheduling — state clearly what you are about to do, what inputs you will use, then execute with audit logging. If a tool fails, provide safe fallback and escalation path.`;

const INTENT_ROUTING = `
INTENT ROUTING — Classify each request into one of:
1) Policy Q (company handbook/process/benefits) → retrieve from Company Policy Brain first
2) Legal baseline Q (minimum legal requirement; jurisdiction-sensitive) → use Legal Brain with citations
3) Process/action request (create doc, open ticket, route to HR, schedule meeting) → use Tools Brain; log everything
4) Personal case guidance (needs HR follow-up, sensitive) → handle with extra care, minimal data storage
5) Unknown/ambiguous → ask minimum clarifying question(s), preferably multiple-choice

Always identify the intent type in your response metadata.`;

const MEMORY_TIERS = `
MEMORY TIERS — Use three tiers:

1) SESSION MEMORY (short-lived; resets when session ends):
- User's stated role (employee/manager/HR), jurisdiction, current question thread context
- Stored automatically from conversation context; do not persist beyond session

2) CASE MEMORY (persistent; per user request; minimal and non-sensitive):
- Ongoing issues and action items (e.g., "employee asked about parental leave; awaiting HR confirmation")
- Links to relevant policies already used; decisions made by tools
- Store only what is needed to continue the workflow
- NEVER store: medical details, protected-class info, or other sensitive personal data
- Write a short "memory note" explaining what is stored and why

3) ORGANIZATIONAL MEMORY (persistent; admin-curated only):
- Canonical links to handbook, policy repository, ticketing endpoints, standard templates
- Definitions of internal acronyms and teams
- Editable only by admins, not by random employee chat`;

const TOOLS_DESCRIPTION = `
AVAILABLE TOOLS:
- create_google_doc(template_type, parameters) → generates a document from a template
- open_hr_ticket(category, summary, details, priority) → opens an HR support ticket
- route_to_hr(contact/team, context) → routes the conversation to the appropriate HR contact
- log_audit(event_type, user_id, timestamp, sources_used, action_taken) → records an audit trail entry

TOOL RULES:
- Before calling a tool, restate what you're about to do and what inputs you will use
- After tool completion, return the result (links/IDs) and log the action
- If a tool fails, provide a safe fallback and escalation`;

const CITATION_FORMAT = `
CITATION FORMAT — For every source cited, include:
- Source Title (and system: Drive/Dropbox/Web/Gov)
- Section/Heading or Page number
- Link or Source ID
Example: "Employee Handbook (Google Drive) – 'Time Off > Bereavement Leave', p.12 – [link]"
Example: "State Labor Dept Guidance (Web) – 'Paid Sick Leave FAQ', updated 2025-01-10 – [link]"

Always distinguish: law/regulation vs company policy vs general guidance.`;

function buildSystemPrompt(role?: string, knowledgeContext?: string, modelInfo?: string, intentType?: string): string {
  const roleSection = role ? ROLE_CONTEXT[role] || "" : "";
  const modelLine = modelInfo ? `\n\nRUNNING ON: ${modelInfo}` : "";

  const knowledgeSection = knowledgeContext
    ? `\n\nCOMPANY KNOWLEDGE BASE (retrieved relevant excerpts — treat as authoritative company policy):\n${knowledgeContext}`
    : `\n\nNOTE: No company documents have been uploaded to the knowledge base yet. You are providing general guidance based on common HR practices and applicable law. Always recommend the employee verify with their actual HR department for binding policy.`;

  return `You are "HR Agent Assist", a channel-agnostic HR assistant designed to serve employees and HR staff.${modelLine}
${roleSection}
${THREE_BRAINS}
${INTENT_ROUTING}
${MEMORY_TIERS}
${TOOLS_DESCRIPTION}
${CITATION_FORMAT}
PRIMARY OBJECTIVES
1) Answer HR questions grounded in company docs (when available), with source citations.
2) Provide law-aware guidance referencing authoritative government sources when relevant, with citations and effective dates when available.
3) Execute approved tools (document generation, ticket creation, request routing) with audit logging.
4) Maintain persistent, scoped memory so you don't forget key context within the organization and within a user's ongoing case, while never hallucinating facts.

CORE RULES
- Never invent policy details. If not found in sources, say "Not found in current sources" and propose next steps.
- Always provide citations for factual claims. Citations must include: source name/title, section/heading or page if available.
- Do not provide legal advice. Provide general information with citations and recommend HR/legal review for high-risk topics.
- High-risk topics (termination, protected leave, accommodations, harassment, discrimination, retaliation, pay disputes, worker classification, safety incidents) require cautious language and an escalation recommendation.
- If the user's location/jurisdiction matters, ask for it once and remember it for the session.
- Memory is context, not authority. If memory conflicts with documents, documents win.

OUTPUT FORMAT
Always produce:
1) **Answer** — clear, directly responsive, role-appropriate
2) **Based on** — citations (if applicable); clearly distinguish law vs company policy
3) **Next steps** — if any action is needed
4) **Escalation note** — if risk is high or topic is sensitive
${knowledgeSection}

TONE: Professional, calm, direct. Do not be overly chatty. Be explicit about uncertainty.`;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Conversations ─────────────────────────────────────────────────────────

  app.get("/api/conversations", async (_req, res) => {
    try {
      res.json(await storage.getAllConversations());
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conv = await storage.getConversation(id);
      if (!conv) return res.status(404).json({ error: "Not found" });
      const msgs = await storage.getMessagesByConversation(id);
      res.json({ ...conv, messages: msgs });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { title, sessionData } = req.body;
      const conv = await storage.createConversation(title || "New Conversation", sessionData || {});
      res.status(201).json(conv);
    } catch (e) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conv = await storage.updateConversation(id, req.body);
      res.json(conv);
    } catch (e) {
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      await storage.deleteConversation(parseInt(req.params.id));
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // ── Messages (streaming) ──────────────────────────────────────────────────

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) return res.status(400).json({ error: "Content required" });

      const conversation = await storage.getConversation(conversationId);
      const role = (conversation?.sessionData as any)?.role;

      // RAG: search knowledge base for relevant chunks
      let knowledgeContext: string | undefined;
      try {
        const chunks = await storage.searchChunks(content.trim(), 5);
        if (chunks.length > 0) {
          knowledgeContext = chunks
            .map((c, i) => `[${i + 1}] From "${c.documentTitle}":\n${c.content}`)
            .join("\n\n---\n\n");
        }
      } catch (_) {}

      // Save user message
      const userMsg = await storage.createMessage({
        conversationId,
        role: "user",
        content: content.trim(),
        metadata: {},
      });

      // Build chat history
      const allMessages = await storage.getMessagesByConversation(conversationId);
      const chatMessages = allMessages.map((m: Message) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Get AI provider and build system prompt with model info
      const provider = getAIProvider();
      const modelInfo = `${provider.providerName} / ${provider.defaultModel}`;

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = provider.chat([
        { role: "system", content: buildSystemPrompt(role, knowledgeContext, modelInfo) },
        ...chatMessages,
      ]);

      let fullResponse = "";
      for await (const delta of stream) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }

      const assistantMsg = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: fullResponse,
        metadata: { model: provider.defaultModel, provider: provider.providerName },
      });

      // Auto-title on first exchange
      if (conversation && conversation.title === "New Conversation") {
        const words = content.trim().split(" ").slice(0, 7).join(" ");
        const title = words.length > 45 ? words.slice(0, 45) + "…" : words;
        await storage.updateConversation(conversationId, { title });
      }

      res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsg.id })}\n\n`);
      res.end();
    } catch (err) {
      console.error("Error in message stream:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get AI response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }
      const hashed = crypto.createHash("sha256").update(password).digest("hex");
      const user = await storage.createUser({ username, password: hashed });
      req.session.userId = user.id;
      res.status(201).json({ id: user.id, username: user.username });
    } catch (e) {
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const hashed = crypto.createHash("sha256").update(password).digest("hex");
      if (user.password !== hashed) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (e) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { user?: SessionUser }).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, username: user.username });
    } catch (e) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // ── Conversations ─────────────────────────────────────────────────────────

  app.get("/api/conversations", requireSession, async (_req, res) => {
    try {
      const provider = getAIProvider();
      res.json({
        status: "ok",
        version: "1.0.0",
        provider: provider.providerName,
        model: provider.defaultModel,
        baseUrl: provider.baseUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(503).json({
        status: "error",
        version: "1.0.0",
        error: (e as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── Models ────────────────────────────────────────────────────────────────

  app.get("/api/models", async (_req, res) => {
    try {
      const provider = getAIProvider();
      const models = await provider.listModels();
      res.json({
        provider: provider.providerName,
        baseUrl: provider.baseUrl,
        defaultModel: provider.defaultModel,
        models,
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to list models" });
    }
  });

  // ── OpenAI-Compatible Chat Completions ────────────────────────────────────

  app.post("/api/chat/completions", requireApiKey, async (req, res) => {
    try {
      const { messages, model, stream = false, max_tokens, role } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const provider = getAIProvider();
      const modelInfo = `${provider.providerName} / ${provider.defaultModel}`;

      // Extract user's last message for RAG
      const userMessages = messages.filter((m: any) => m.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";

      // RAG: search knowledge base for relevant chunks
      let knowledgeContext: string | undefined;
      try {
        const chunks = await storage.searchChunks(lastUserMessage.trim(), 5);
        if (chunks.length > 0) {
          knowledgeContext = chunks
            .map((c, i) => `[${i + 1}] From "${c.documentTitle}":\n${c.content}`)
            .join("\n\n---\n\n");
        }
      } catch (_) {}

      // Inject system prompt if no system message provided
      const systemPrompt = buildSystemPrompt(role, knowledgeContext, modelInfo);
      const hasSystemMessage = messages.some((m: any) => m.role === "system");
      const chatMessages = hasSystemMessage
        ? messages
        : [{ role: "system" as const, content: systemPrompt }, ...messages];

      if (stream) {
        // SSE streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const stream = provider.chat(chatMessages, {
          model: model || undefined,
          maxTokens: max_tokens || undefined,
        });

        const id = `chatcmpl-${Date.now()}`;
        const created = Math.floor(Date.now() / 1000);

        res.write(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model: provider.defaultModel,
            choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
          })}\n\n`,
        );

        let fullResponse = "";
        for await (const delta of stream) {
          fullResponse += delta;
          res.write(
            `data: ${JSON.stringify({
              id,
              object: "chat.completion.chunk",
              created,
              model: provider.defaultModel,
              choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
            })}\n\n`,
          );
        }

        res.write(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model: provider.defaultModel,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          })}\n\n`,
        );

        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        // Non-streaming response
        let fullResponse = "";
        for await (const delta of provider.chat(chatMessages, {
          model: model || undefined,
          maxTokens: max_tokens || undefined,
        })) {
          fullResponse += delta;
        }

        res.json({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: provider.defaultModel,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: fullResponse },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      }
    } catch (err) {
      console.error("Error in chat completions:", err);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // ── Documents ─────────────────────────────────────────────────────────────

  app.get("/api/documents", async (_req, res) => {
    try {
      res.json(await storage.getAllDocuments());
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await storage.deleteDocument(parseInt(req.params.id));
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.post(
    "/api/documents/upload",
    upload.array("files", 20),
    async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results: Array<{ filename: string; status: string; error?: string; chunks?: number }> = [];

      for (const file of files) {
        try {
          const text = await extractTextFromFile(file.path, file.mimetype, file.originalname);
          const chunks = chunkText(text);

          const doc = await storage.createDocument({
            title: path.basename(file.originalname, path.extname(file.originalname)),
            filename: file.originalname,
            fileType: path.extname(file.originalname).toLowerCase().slice(1),
            fileSize: file.size,
            chunkCount: chunks.length,
          });

          await storage.createDocumentChunks(
            chunks.map((content, idx) => ({
              documentId: doc.id,
              chunkIndex: idx,
              content,
            }))
          );

          results.push({ filename: file.originalname, status: "ok", chunks: chunks.length });
        } catch (err: any) {
          console.error(`Failed to process ${file.originalname}:`, err);
          results.push({ filename: file.originalname, status: "error", error: err.message });
        } finally {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
      }

      res.json({ results });
    }
  );

  return httpServer;
}
