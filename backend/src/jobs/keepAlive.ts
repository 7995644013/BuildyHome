import cron from "node-cron";
import { logger } from "../config/logger";

/**
 * Keep-alive job to prevent Render free tier from spinning down
 * Render spins down free services after 15 minutes of inactivity
 * This job pings the health endpoint every 14 minutes
 */
export function startKeepAliveJob() {
  const serviceUrl = process.env.SERVICE_URL || process.env.RENDER_EXTERNAL_URL;
  
  if (!serviceUrl) {
    logger.warn("Keep-alive job: SERVICE_URL not set, skipping (service may spin down after inactivity)");
    return;
  }

  // Run every 14 minutes to keep the service alive
  cron.schedule("*/14 * * * *", async () => {
    try {
      const healthUrl = `${serviceUrl}/health`;
      logger.debug(`Keep-alive ping: ${healthUrl}`);
      
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "User-Agent": "BuildyHome-KeepAlive/1.0",
        },
      });
      
      if (response.ok) {
        logger.debug("Keep-alive ping successful");
      } else {
        logger.warn(`Keep-alive ping failed with status: ${response.status}`);
      }
    } catch (error) {
      logger.error("Keep-alive ping error:", error);
    }
  });

  logger.info("Keep-alive job scheduled (runs every 14 minutes)");
}
