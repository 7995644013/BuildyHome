import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring("Bearer ".length);
  const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!publicKey) {
    return res.status(500).json({ error: "JWT_PUBLIC_KEY not configured" });
  }
  try {
    const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as {
      sub: string;
      role: UserRole;
    };
    (req as AuthenticatedRequest).user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

