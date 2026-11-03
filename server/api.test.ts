import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import { createServer } from "http";
import supertest from "supertest";
import session from "express-session";
import { registerRoutes } from "./routes";
import { addUserToRequest } from "./session";
import type { IStorage } from "./storage";
import type {
  User, InsertUser, Conversation, InsertConversation,
  Message, InsertMessage, Document, InsertDocument,
  DocumentChunk, InsertDocumentChunk,
} from "@shared/schema";

// ── In-memory IStorage ───────────────────────────────────────────────────────
// The real route handlers run against this; nothing is re-implemented here.

class MemoryStorage implements IStorage {
  users: User[] = [];
  conversations: Conversation[] = [];
  messages: Message[] = [];
  documents: Document[] = [];
  chunks: Array<DocumentChunk & { documentTitle: string }> = [];
  private seq = 1;

  async getUser(id: string) {
    return this.users.find((u) => u.id === id);
  }
  async getUserByUsername(username: string) {
    return this.users.find((u) => u.username === username);
  }
  async createUser(user: InsertUser) {
    const created: User = { id: `user-${this.seq++}`, ...user };
    this.users.push(created);
    return created;
  }

  async getAllConversations(userId: string) {
    return this.conversations.filter((c) => c.userId === userId);
  }
  async getConversation(id: number, userId: string) {
    return this.conversations.find((c) => c.id === id && c.userId === userId);
  }
  async createConversation(userId: string, title: string, sessionData: object = {}) {
    const created: Conversation = {
      id: this.seq++,
      userId,
      title,
      sessionData: sessionData as Conversation["sessionData"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.push(created);
    return created;
  }
  async updateConversation(id: number, userId: string, data: Partial<InsertConversation>) {
    const conv = await this.getConversation(id, userId);
    if (!conv) return undefined;
    Object.assign(conv, data, { updatedAt: new Date() });
    return conv;
  }
  async deleteConversation(id: number, userId: string) {
    this.conversations = this.conversations.filter((c) => !(c.id === id && c.userId === userId));
  }

  async getMessagesByConversation(conversationId: number) {
    return this.messages.filter((m) => m.conversationId === conversationId);
  }
  async createMessage(data: InsertMessage) {
    const created: Message = {
      id: this.seq++,
      metadata: {},
      createdAt: new Date(),
      ...data,
    } as Message;
    this.messages.push(created);
    return created;
  }

  async getAllDocuments() {
    return this.documents;
  }
  async getDocument(id: number) {
    return this.documents.find((d) => d.id === id);
  }
  async createDocument(data: InsertDocument) {
    const created: Document = { id: this.seq++, createdAt: new Date(), ...data } as Document;
    this.documents.push(created);
    return created;
  }
  async updateDocumentChunkCount(id: number, count: number) {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) doc.chunkCount = count;
  }
  async deleteDocument(id: number) {
    this.documents = this.documents.filter((d) => d.id !== id);
  }

  async createDocumentChunks(chunks: InsertDocumentChunk[]) {
    for (const chunk of chunks) {
      this.chunks.push({ id: this.seq++, createdAt: new Date(), ...chunk, documentTitle: "Policy" } as any);
    }
  }
  async searchChunks(query: string, limit = 5) {
    return this.chunks
      .filter((c) => c.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }
}

// ── Fake AI provider ─────────────────────────────────────────────────────────

const fakeProvider = {
  name: "fake",
  providerName: "Fake",
  baseUrl: "http://fake",
  defaultModel: "fake-model",
  async *chat() {
    yield "Hello";
    yield " world";
  },
  async listModels() {
    return ["fake-model"];
  },
};

async function buildApp(store: IStorage, getProvider: () => any = () => fakeProvider) {
  const app = express();
  app.use(session({ secret: "test-secret", resave: false, saveUninitialized: false }));
  app.use(addUserToRequest);
  app.use(express.json());
  await registerRoutes(createServer(app), app, { storage: store, getProvider });
  return app;
}

async function register(agent: ReturnType<typeof supertest.agent>, username: string) {
  const res = await agent.post("/api/auth/register").send({ username, password: "password123" });
  expect(res.status).toBe(201);
  return res.body as { id: string; username: string };
}

// ── Health ───────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("reports provider and model when the LLM is configured", async () => {
    const res = await supertest(await buildApp(new MemoryStorage())).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", version: "1.0.0", provider: "Fake", model: "fake-model" });
  });

  it("still reports the server healthy when the LLM is not configured", async () => {
    const app = await buildApp(new MemoryStorage(), () => {
      throw new Error("LLM_API_KEY is not set");
    });
    const res = await supertest(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", llm: "unconfigured", provider: null });
  });
});

// ── Auth ─────────────────────────────────────────────────────────────────────

describe("Auth", () => {
  let store: MemoryStorage;
  let agent: ReturnType<typeof supertest.agent>;

  beforeEach(async () => {
    store = new MemoryStorage();
    agent = supertest.agent(await buildApp(store));
  });

  it("rejects a short password", async () => {
    const res = await agent.post("/api/auth/register").send({ username: "evan", password: "short" });
    expect(res.status).toBe(400);
  });

  it("registers a user and starts a session", async () => {
    const user = await register(agent, "evan");
    expect(user.username).toBe("evan");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.username).toBe("evan");
  });

  it("rejects a duplicate username", async () => {
    await register(agent, "evan");
    const res = await agent.post("/api/auth/register").send({ username: "evan", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects a bad password on login", async () => {
    await register(agent, "evan");
    const res = await supertest(await buildApp(store))
      .post("/api/auth/login")
      .send({ username: "evan", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("returns 401 from /api/auth/me without a session", async () => {
    const res = await supertest(await buildApp(store)).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

// ── Conversations & ownership ────────────────────────────────────────────────

describe("Conversations", () => {
  let store: MemoryStorage;
  let alice: ReturnType<typeof supertest.agent>;
  let bob: ReturnType<typeof supertest.agent>;

  beforeEach(async () => {
    store = new MemoryStorage();
    const app = await buildApp(store);
    alice = supertest.agent(app);
    bob = supertest.agent(app);
    await register(alice, "alice");
    await register(bob, "bob");
  });

  it("requires a session", async () => {
    const res = await supertest(await buildApp(store)).get("/api/conversations");
    expect(res.status).toBe(401);
  });

  it("creates and lists a conversation for the current user", async () => {
    const created = await alice.post("/api/conversations").send({ title: "Leave policy" });
    expect(created.status).toBe(201);

    const list = await alice.get("/api/conversations");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe("Leave policy");
  });

  it("hides another user's conversation", async () => {
    const created = await alice.post("/api/conversations").send({ title: "Private case" });
    const res = await bob.get(`/api/conversations/${created.body.id}`);
    expect(res.status).toBe(404);
    expect((await bob.get("/api/conversations")).body).toHaveLength(0);
  });

  it("refuses to update or delete another user's conversation", async () => {
    const created = await alice.post("/api/conversations").send({ title: "Private case" });
    expect((await bob.patch(`/api/conversations/${created.body.id}`).send({ title: "hijacked" })).status).toBe(404);
    expect((await bob.delete(`/api/conversations/${created.body.id}`)).status).toBe(404);
  });

  it("refuses to post a message into another user's conversation", async () => {
    const created = await alice.post("/api/conversations").send({ title: "Private case" });
    const res = await bob.post(`/api/conversations/${created.body.id}/messages`).send({ content: "hello" });
    expect(res.status).toBe(404);
  });

  it("streams an assistant reply and persists both messages", async () => {
    const created = await alice.post("/api/conversations").send({ title: "New Conversation" });
    const res = await alice
      .post(`/api/conversations/${created.body.id}/messages`)
      .send({ content: "What is the leave policy?" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("Hello");
    expect(res.text).toContain('"done":true');

    const conversation = await alice.get(`/api/conversations/${created.body.id}`);
    expect(conversation.body.messages).toHaveLength(2);
    expect(conversation.body.messages[0].role).toBe("user");
    expect(conversation.body.messages[1].content).toBe("Hello world");
  });
});

// ── Knowledge base ───────────────────────────────────────────────────────────

describe("Knowledge base", () => {
  let store: MemoryStorage;
  let agent: ReturnType<typeof supertest.agent>;

  beforeEach(async () => {
    store = new MemoryStorage();
    store.chunks.push({
      id: 1,
      documentId: 1,
      chunkIndex: 0,
      content: "Employees receive 15 days of paid time off per year.",
      documentTitle: "Employee Handbook",
      createdAt: new Date(),
    });
    agent = supertest.agent(await buildApp(store));
    await register(agent, "evan");
  });

  it("requires a session", async () => {
    expect((await supertest(await buildApp(store)).get("/api/documents")).status).toBe(401);
  });

  it("lists documents", async () => {
    const res = await agent.get("/api/documents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("validates the search query", async () => {
    expect((await agent.get("/api/search")).status).toBe(400);
  });

  it("returns matching chunks with their source", async () => {
    const res = await agent.get("/api/search").query({ q: "paid time off" });
    expect(res.status).toBe(200);
    expect(res.body.chunks).toHaveLength(1);
    expect(res.body.chunks[0].documentTitle).toBe("Employee Handbook");
  });
});

// ── OpenAI-compatible API ────────────────────────────────────────────────────

describe("POST /api/chat/completions", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp(new MemoryStorage());
  });

  it("requires a messages array", async () => {
    const res = await supertest(app).post("/api/chat/completions").send({});
    expect(res.status).toBe(400);
  });

  it("returns an OpenAI-shaped completion", async () => {
    const res = await supertest(app)
      .post("/api/chat/completions")
      .send({ messages: [{ role: "user", content: "Hello" }] });

    expect(res.status).toBe(200);
    expect(res.body.object).toBe("chat.completion");
    expect(res.body.choices[0].message.content).toBe("Hello world");
  });
});
