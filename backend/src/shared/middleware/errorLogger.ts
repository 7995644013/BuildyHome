import { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger";

export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorData = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userId: (req as any).user?.id || "anonymous",
    body: req.body,
    query: req.query,
    params: req.params,
  };

  // Log error with full context
  logger.error("Request error", errorData);

  next(err);
}

