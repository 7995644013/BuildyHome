import { z } from "zod";

export const createMaterialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().positive("Unit price must be positive"),
  quantityAvailable: z.number().int().min(0).optional().default(0),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const updateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  unitPrice: z.number().positive().optional(),
  quantityAvailable: z.number().int().min(0).optional(),
  description: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
