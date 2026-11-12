import cron from "node-cron";
import { escalateToArbitration } from "../modules/tasks/task.service";
import { logger } from "../config/logger";

/**
 * Scheduled job to auto-escalate tasks to ARBITRATION after 7 days in PENDING_APPROVAL
 * Runs every hour
 */
export function startArbitrationEscalationJob() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      logger.info("Running arbitration escalation job");
      const result = await escalateToArbitration();
      if (result.count > 0) {
        logger.info(`Escalated ${result.count} task(s) to arbitration`);
      }
    } catch (error) {
      logger.error("Error in arbitration escalation job", { error });
    }
  });

  logger.info("Arbitration escalation job scheduled (runs every hour)");
}

