import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import supertest from "supertest";
import crypto from "crypto";
import session from "express-session";

// ── Mock Storage ─────────────────────────────────────────────────────────────

interface MockUser { id: string; username: string; password: string; }
interface MockConversation { id: number; title: string; sessionData: object; }
interface MockMessage { id: number; conversationId: number; role: string; content: string; metadata: object; }

const mockUsers: MockUser[] = [];
const mockConversations: MockConversation[] = [{ id: 1, title: "Test", sessionData: {} }];
const mockMessages: MockMessage[] = [];

function makeMockStorage() {
  return {
    getUser: vi.fn(async (id: string) => mockUsers.find((u) => u.id === id)),
    getUserByUsername: vi.fn(async (username: string) => mockUsers.find((u) => u.username === username)),
    createUser: vi.fn(async (user: any) => {
      const newUser = { id: crypto.randomUUID(), ...user };
      mockUsers.push(newUser);
      return newUser;
    }),
    getAllConversations: vi.fn(async () => mockConversations),
    getConversation: vi.fn(async (id: number) => mockConversations.find((c) => c.id === id)),
    createConversation: vi.fn(async (title: string, sessionData?: object) => {
      const conv = { id: mockConversations.length + 1, title, sessionData: sessionData || {} };
      mockConversations.push(conv);
      return conv;
    }),
    updateConversation: vi.fn(async (id: number, data: any) => {
      const conv = mockConversations.find((c) => c.id === id);
      if (conv) Object.assign(conv, data);
      return conv;
    }),
    deleteConversation: vi.fn(async (id: number) => {
      const idx = mockConversations.findIndex((c) => c.id === id);
      if (idx !== -1) mockConversations.splice(idx, 1);
    }),
    getMessagesByConversation: vi.fn(async (conversationId: number) =>
      mockMessages.filter((m) => m.conversationId === conversationId),
    ),
    createMessage: vi.fn(async (data: any) => {
      const msg = { id: mockMessages.length + 1, ...data };
      mockMessages.push(msg);
      return msg;
    }),
    getAllDocuments: vi.fn(async () => []),
    getDocument: vi.fn(async (id: number) => undefined),
    createDocument: vi.fn(async (data: any) => ({ id: 1, ...data })),
    updateDocumentChunkCount: vi.fn(async () => {}),
    deleteDocument: vi.fn(async (id: number) => {}),
    createDocumentChunks: vi.fn(async () => {}),
    searchChunks: vi.fn(async (query: string, limit?: number) => [
      { id: 1, documentId: 1, chunkIndex: 0, content: `Mock chunk for: ${query}`, documentTitle: "Test Doc" },
    ]),
  };
}

// ── Test App Setup ────────────────────────────────────────────────────────────

function createTestApp(mockStorage: ReturnType<typeof makeMockStorage>, withSession = false) {
  const app = express();
  if (withSession) {
    app.use(session({ secret: "test-secret", resave: false, saveUninitialized: false }));
  }
  app.use(express.json());

  // Auth endpoints
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const existing = await mockStorage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already taken" });
    const hashed = crypto.createHash("sha256").update(password).digest("hex");
    const user = await mockStorage.createUser({ username, password: hashed });
    res.status(201).json({ id: user.id, username: user.username });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const user = await mockStorage.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const hashed = crypto.createHash("sha256").update(password).digest("hex");
    if (user.password !== hashed) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ id: user.id, username: user.username });
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
    const token = authHeader.slice(7);
    const user = mockUsers.find((u) => u.id === token);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, username: user.username });
  });

  // Conversation endpoints
  app.get("/api/conversations", async (_req, res) => {
    res.json(await mockStorage.getAllConversations());
  });

  app.post("/api/conversations", async (req, res) => {
    const { title, sessionData } = req.body;
    const conv = await mockStorage.createConversation(title || "New Conversation", sessionData || {});
    res.status(201).json(conv);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const conv = await mockStorage.getConversation(id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    const msgs = await mockStorage.getMessagesByConversation(id);
    res.json({ ...conv, messages: msgs });
  });

  // Document endpoints
  app.get("/api/documents", async (_req, res) => {
    res.json(await mockStorage.getAllDocuments());
  });

  // RAG endpoint
  app.get("/api/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "q query param required" });
    const chunks = await mockStorage.searchChunks(query, 5);
    res.json({ chunks });
  });

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0", provider: "Test", model: "test-model" });
  });

  return app;
}

// ── Auth Tests ────────────────────────────────────────────────────────────────

describe("Auth Routes", () => {
  let app: express.Express;
  let server: Server;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    mockUsers.length = 0;
    mockConversations.length = 1;
    mockMessages.length = 0;

    const mockStorage = makeMockStorage();
    app = createTestApp(mockStorage, true);
    server = createServer(app);
    request = supertest(server);
  });

  afterAll(() => server.close());

  describe("POST /api/auth/register", () => {
    it("returns 400 when username is missing", async () => {
      const res = await request.post("/api/auth/register").send({ password: "password123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username/i);
    });

    it("returns 400 when password is too short", async () => {
      const res = await request.post("/api/auth/register").send({ username: "testuser", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password/i);
    });

    it("returns 400 when username is too short", async () => {
      const res = await request.post("/api/auth/register").send({ username: "ab", password: "password123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username/i);
    });

    it("registers a new user successfully", async () => {
      const res = await request.post("/api/auth/register").send({
        username: "testuser",
        password: "password123",
      });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe("testuser");
      expect(res.body.id).toBeDefined();
    });

    it("returns 409 when username is taken", async () => {
      await request.post("/api/auth/register").send({ username: "duplicate", password: "password123" });
      const res = await request.post("/api/auth/register").send({ username: "duplicate", password: "password123" });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/taken/i);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      mockUsers.length = 0;
      await request.post("/api/auth/register").send({ username: "loginuser", password: "password123" });
    });

    it("returns 400 when credentials missing", async () => {
      const res = await request.post("/api/auth/login").send({});
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid username", async () => {
      const res = await request.post("/api/auth/login").send({ username: "nouser", password: "password123" });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it("returns 401 for invalid password", async () => {
      await request.post("/api/auth/login").send({ username: "loginuser", password: "password123" });
      const res = await request.post("/api/auth/login").send({ username: "loginuser", password: "wrongpassword" });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it("logs in successfully with correct credentials", async () => {
      const res = await request.post("/api/auth/login").send({ username: "loginuser", password: "password123" });
      expect(res.status).toBe(200);
      expect(res.body.username).toBe("loginuser");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without authorization header", async () => {
      const res = await request.get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown user id", async () => {
      const res = await request.get("/api/auth/me").set("Authorization", "Bearer unknown-user-id");
      expect(res.status).toBe(404);
    });
  });
});

// ── Conversation Tests ────────────────────────────────────────────────────────

describe("Conversation Routes", () => {
  let app: express.Express;
  let server: Server;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    mockConversations.length = 0;
    const mockStorage = makeMockStorage();
    app = createTestApp(mockStorage, true);
    server = createServer(app);
    request = supertest(server);
  });

  afterAll(() => server.close());

  describe("GET /api/conversations", () => {
    it("returns list of conversations", async () => {
      const res = await request.get("/api/conversations");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/conversations", () => {
    it("creates a conversation with default title", async () => {
      const res = await request.post("/api/conversations").send({});
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New Conversation");
    });

    it("creates a conversation with custom title", async () => {
      const res = await request.post("/api/conversations").send({ title: "My Conversation" });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("My Conversation");
    });

    it("creates a conversation with session data", async () => {
      const res = await request.post("/api/conversations").send({
        title: "Role Test",
        sessionData: { role: "employee" },
      });
      expect(res.status).toBe(201);
      expect(res.body.sessionData).toEqual({ role: "employee" });
    });
  });

  describe("GET /api/conversations/:id", () => {
    it("returns 404 for unknown conversation", async () => {
      const res = await request.get("/api/conversations/99999");
      expect(res.status).toBe(404);
    });

    it("returns conversation with messages", async () => {
      const createRes = await request.post("/api/conversations").send({ title: "Conv with msgs" });
      const id = createRes.body.id;

      const res = await request.get(`/api/conversations/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.messages).toBeDefined();
    });
  });
});

// ── RAG / Search Tests ────────────────────────────────────────────────────────

describe("RAG Pipeline", () => {
  let app: express.Express;
  let server: Server;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const mockStorage = makeMockStorage();
    app = createTestApp(mockStorage, true);
    server = createServer(app);
    request = supertest(server);
  });

  afterAll(() => server.close());

  describe("GET /api/search", () => {
    it("returns 400 when q param is missing", async () => {
      const res = await request.get("/api/search");
      expect(res.status).toBe(400);
    });

    it("returns chunks for a query", async () => {
      const res = await request.get("/api/search?q=parental+leave");
      expect(res.status).toBe(200);
      expect(res.body.chunks).toBeDefined();
      expect(Array.isArray(res.body.chunks)).toBe(true);
    });

    it("returns chunk with documentTitle", async () => {
      const res = await request.get("/api/search?q=parental+leave");
      expect(res.body.chunks[0].documentTitle).toBeDefined();
    });
  });
});

// ── Health & Document Tests ───────────────────────────────────────────────────

describe("Health & Documents", () => {
  let app: express.Express;
  let server: Server;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const mockStorage = makeMockStorage();
    app = createTestApp(mockStorage, true);
    server = createServer(app);
    request = supertest(server);
  });

  afterAll(() => server.close());

  describe("GET /api/health", () => {
    it("returns health status with version", async () => {
      const res = await request.get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.version).toBe("1.0.0");
    });
  });

  describe("GET /api/documents", () => {
    it("returns empty array when no documents", async () => {
      const res = await request.get("/api/documents");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});