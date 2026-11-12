import { createApp } from "./app";
import { logger } from "./config/logger";
import { prisma } from "./config/database";
import { startArbitrationEscalationJob } from "./jobs/arbitrationEscalation";
import { startKeepAliveJob } from "./jobs/keepAlive";

const app = createApp();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || "0.0.0.0";

// Test database connection before starting server
async function startServer() {
  try {
    // Test database connection (non-blocking - server will start even if DB fails)
    prisma.$connect()
      .then(() => {
        logger.info("Database connection established");
        console.log("Database connected successfully");
      })
      .catch((error) => {
        logger.error("Database connection failed (server will continue):", error);
        console.error("Database connection failed:", error.message);
      });

    const server = app.listen(port, host, () => {
      logger.info(`BuildyHome API listening on ${host}:${port}`, {
        environment: process.env.NODE_ENV || "development",
        port,
        host,
      });
      console.log(`Server is running on http://${host}:${port}`);
      console.log(`Health check available at http://${host}:${port}/health`);

      // Start scheduled jobs (wrapped in try-catch to prevent crashes)
      try {
        startArbitrationEscalationJob();
        startKeepAliveJob();
      } catch (error) {
        logger.error("Failed to start scheduled jobs:", error);
        console.error("Failed to start scheduled jobs:", error);
      }
    });

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

      switch (error.code) {
        case "EACCES":
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info("HTTP server closed");
        await prisma.$disconnect().catch(() => {
          // Ignore disconnect errors during shutdown
        });
        logger.info("Database connection closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    console.error("Server startup failed:", error);
    await prisma.$disconnect().catch(() => {
      // Ignore disconnect errors
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

startServer();
