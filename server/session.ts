import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import memorystore from "memorystore";
import type { Request, Response, NextFunction } from "express";

const PgSession = connectPgSimple(session);
const MemoryStore = memorystore(session);

const isProduction = process.env.NODE_ENV === "production";

export function buildSessionMiddleware() {
  const sessionSecret = process.env.SESSION_SECRET || "hr-care-dev-secret-change-in-production";

  const pgStore = new PgSession({
    conString: process.env.DATABASE_URL || process.env.DATABASE_URL!,
    tableName: "session",
    createTableIfMissing: true,
  });

  const memoryStore = new MemoryStore({
    checkPeriod: 86400000,
  });

  return session({
    store: isProduction ? pgStore : memoryStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: "hr_sid",
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export function addUserToRequest(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !("userId" in req.session)) {
    return next();
  }
  (req as any).user = { id: req.session.userId as string };
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}