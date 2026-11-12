import { z } from "zod";

export const createReportSchema = z.object({
  reportDate: z.string().datetime().or(z.date()),
  workDone: z.string().min(1),
  issues: z.string().optional(),
  nextSteps: z.string().optional(),
});

export const updateReportSchema = createReportSchema.partial();

