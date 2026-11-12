import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().optional().default("member"),
});

