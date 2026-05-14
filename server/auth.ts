import type { Request, Response, NextFunction } from "express";

const API_KEY = process.env.API_KEY || "";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryKey = req.query.api_key as string;

  if (bearerToken === API_KEY || queryKey === API_KEY) {
    return next();
  }

  res.status(401).json({
    error: "Unauthorized",
    message: "Valid API key required in Authorization: Bearer <key> or ?api_key=<key>",
  });
}

export function hasAuthConfigured(): boolean {
  return !!API_KEY;
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export interface SessionUser {
  id: string;
  username: string;
}

declare module "express" {
  interface Request {
    user?: SessionUser;
  }
}