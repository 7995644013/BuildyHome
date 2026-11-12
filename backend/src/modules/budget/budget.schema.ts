import { z } from "zod";

// Fix #5: Changed from .nonnegative() to .positive() - budget must be > 0
export const upsertBudgetSchema = z.object({
  projectId: z.string().uuid(),
  totalAmount: z.number().positive("Budget amount must be greater than 0"),
  currency: z.string().optional(),
});

export const expenseSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  expenseType: z.enum(["TASK_RELATED", "MATERIAL", "GENERAL"]),
  expenseDate: z.string().datetime().optional(),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  expenseType: z.enum(["TASK_RELATED", "MATERIAL", "GENERAL"]).optional(),
  expenseDate: z.string().datetime().optional(),
});

// Fix #8 & #13: Query schema for pagination and date filtering
export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
// Budget Items Schema
export const budgetItemSchema = z.object({
  id: z.string().uuid().optional(), // Optional for new items
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const draftBudgetSchema = z.object({
  projectId: z.string().uuid(),
  currency: z.string().default("USD"),
  items: z.array(budgetItemSchema).min(1, "At least one budget item is required"),
});
