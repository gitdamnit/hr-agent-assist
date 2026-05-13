import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import supertest from "supertest";

describe("API Endpoints", () => {
  let app: express.Express;
  let server: Server;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok", version: "1.0.0" });
    });

    app.get("/api/models", (_req, res) => {
      res.json({ provider: "test", models: ["test-model"] });
    });

    server = createServer(app);
    request = supertest(server);
  });

  afterAll(() => {
    server.close();
  });

  describe("GET /api/health", () => {
    it("returns health status", async () => {
      const res = await request.get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.version).toBe("1.0.0");
    });
  });

  describe("GET /api/models", () => {
    it("returns model list", async () => {
      const res = await request.get("/api/models");
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe("test");
      expect(Array.isArray(res.body.models)).toBe(true);
    });
  });
});
