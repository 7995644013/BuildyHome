import { z } from "zod";

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "ARBITRATION"]).optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const approveTaskSchema = z.object({
  userApproved: z.boolean().optional(),
  adminApproved: z.boolean().optional(),
  clientApproved: z.boolean().optional(),
});

export const taskPhotoSchema = z.object({
  photoUrl: z.string().url().or(z.string().startsWith("data:image")),
  caption: z.string().optional(),
});

export const taskCommentSchema = z.object({
  content: z.string().min(1),
});

