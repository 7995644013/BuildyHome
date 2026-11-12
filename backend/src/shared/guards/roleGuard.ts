import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./authGuard";
import { UserRole } from "@prisma/client";

export function roleGuard(allowed: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

