import { db } from "./db";
import { conversations, messages, documents, documentChunks } from "@shared/schema";
import type {
  Conversation, InsertConversation, Message, InsertMessage,
  Document, InsertDocument, DocumentChunk, InsertDocumentChunk,
  User, InsertUser,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { users } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(title: string, sessionData?: object): Promise<Conversation>;
  updateConversation(id: number, data: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  getAllDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocumentChunkCount(id: number, count: number): Promise<void>;
  deleteDocument(id: number): Promise<void>;

  createDocumentChunks(chunks: InsertDocumentChunk[]): Promise<void>;
  searchChunks(query: string, limit?: number): Promise<Array<DocumentChunk & { documentTitle: string }>>;
}

export class DbStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser: InsertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }
  async getConversation(id: number) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }
  async createConversation(title: string, sessionData: object = {}) {
    const [conv] = await db.insert(conversations).values({ title, sessionData }).returning();
    return conv;
  }
  async updateConversation(id: number, data: Partial<InsertConversation>) {
    const [conv] = await db.update(conversations).set({ ...data, updatedAt: new Date() }).where(eq(conversations.id, id)).returning();
    return conv;
  }
  async deleteConversation(id: number) {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }
  async createMessage(data: InsertMessage) {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  async getAllDocuments() {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }
  async getDocument(id: number) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }
  async createDocument(data: InsertDocument) {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }
  async updateDocumentChunkCount(id: number, count: number) {
    await db.update(documents).set({ chunkCount: count }).where(eq(documents.id, id));
  }
  async deleteDocument(id: number) {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createDocumentChunks(chunks: InsertDocumentChunk[]) {
    if (chunks.length === 0) return;
    await db.insert(documentChunks).values(chunks);
  }

  async searchChunks(query: string, limit = 5): Promise<Array<DocumentChunk & { documentTitle: string }>> {
    const result = await db.execute(sql`
      SELECT dc.*, d.title as "documentTitle",
             ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', ${query})) as rank
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    return result.rows as Array<DocumentChunk & { documentTitle: string }>;
  }
}

export const storage = new DbStorage();
