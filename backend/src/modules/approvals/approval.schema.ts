import { z } from "zod";

export const createApprovalSchema = z.object({
  type: z.enum(["TICKET_CLOSE", "BUDGET_APPROVAL", "PROJECT_DELETE"]),
  targetId: z.string().uuid(),
  // description/reason can be added if needed
  comments: z.string().optional(),
});

export const respondApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  comments: z.string().optional(),
});
