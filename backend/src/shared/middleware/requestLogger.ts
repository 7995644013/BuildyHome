import { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log request
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    userId: (req as any).user?.id || "anonymous",
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userId: (req as any).user?.id || "anonymous",
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", logData);
    } else {
      logger.info("Request completed", logData);
    }
  });

  next();
}

