/**
 * Express App Factory
 * Exports the Express app without starting the server
 * Used for testing and potential serverless deployments
 */

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.router";
import { userRouter } from "./modules/users/user.router";
import { projectRouter } from "./modules/projects/project.router";
import { taskRouter } from "./modules/tasks/task.router";
import { budgetRouter } from "./modules/budget/budget.router";
import { teamRouter } from "./modules/teams/team.router";
import { reportRouter } from "./modules/reports/report.router";
import { analyticsRouter } from "./modules/analytics/analytics.router";
import { clientRouter } from "./modules/client/client.router";
import { materialRouter } from "./modules/materials/material.router";
import { approvalRouter } from "./modules/approvals/approval.router";
import { ticketRouter } from "./modules/tickets/ticket.router";
import { logger } from "./config/logger";
import { requestLogger } from "./shared/middleware/requestLogger";
import { errorLogger } from "./shared/middleware/errorLogger";

dotenv.config();

export function createApp() {
  const app = express();

  // CORS Configuration
  const corsOptions = {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : process.env.NODE_ENV === "production"
        ? [] // In production, explicitly set allowed origins
        : [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:5174",
          ], // Default dev origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count", "X-Page-Count"],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging middleware (before routes)
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Routes
  app.use("/auth", authRouter);
  app.use("/users", userRouter);
  app.use("/projects", projectRouter);
  app.use("/tasks", taskRouter);
  app.use("/teams", teamRouter);
  app.use("/reports", reportRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/client", clientRouter);
  app.use("/budget", budgetRouter);
  app.use("/materials", materialRouter);
  app.use("/approvals", approvalRouter);
  app.use("/tickets", ticketRouter);

  // Error logging middleware (before error handler)
  app.use(errorLogger);

  // Error handler
  app.use((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || "Internal server error";

      // Don't expose internal errors in production
      const errorResponse: { error: string; details?: unknown } = {
        error: message,
      };

      if (process.env.NODE_ENV !== "production" && err.stack) {
        errorResponse.details = err.stack;
      }

      res.status(statusCode).json(errorResponse);
    }
  );

  // 404 handler
  app.use((_req, res) => {
    logger.warn("Route not found", { path: _req.path, method: _req.method });
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
