import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.string().optional(),
  clientId: z.string().uuid().optional(),
  projectManagerId: z.string().uuid().optional(), // Required for Super Admin/Admin, auto-set for PM
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

export const updateProjectSchema = createProjectSchema.partial();

export const landInfoSchema = z.object({
  address: z.string().min(1),
  areaSqft: z.number().positive().optional(),
  ownershipType: z.string().optional(),
  legalDescription: z.string().optional(),
  coordinates: z.any().optional(),
});

