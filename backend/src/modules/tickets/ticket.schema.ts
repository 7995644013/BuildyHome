import { z } from "zod";

export const createTicketSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const requestClosureSchema = z.object({
  comments: z.string().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED", "CLOSED", "PENDING_CLOSE_APPROVAL"]),
});
