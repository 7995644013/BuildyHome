import { ExpenseType, BudgetStatus, ApprovalType, ExpenseStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { createApprovalRequest } from "../approvals/approval.service";
import { AppError } from "../../utils/AppError";

// Fix #1 & #4: Budget upsert with recalculation and transaction
export async function upsertBudget(data: { projectId: string; totalAmount: number; currency?: string }) {
  return prisma.$transaction(async (tx) => {
    // Check if budget exists
    const existingBudget = await tx.budget.findUnique({
      where: { projectId: data.projectId },
    });

    if (existingBudget) {
      // Update existing budget
      await tx.budget.update({
        where: { projectId: data.projectId },
        data: {
          totalAmount: data.totalAmount,
          currency: data.currency ?? existingBudget.currency ?? "USD",
        },
      });

      // Recalculate remaining amount based on expenses
      const totals = await tx.expense.aggregate({
        _sum: { amount: true },
        where: { projectId: data.projectId, status: ExpenseStatus.APPROVED },
      });
      const spent = Number(totals._sum.amount ?? 0);
      const remaining = data.totalAmount - spent;

      // Update remaining amount
      return tx.budget.update({
        where: { projectId: data.projectId },
        data: { remainingAmount: remaining },
      });
    } else {
      // Create new budget
      return tx.budget.create({
        data: {
          projectId: data.projectId,
          totalAmount: data.totalAmount,
          remainingAmount: data.totalAmount,
          currency: data.currency ?? "USD",
        },
      });
    }
  });
}

export async function submitBudgetForApproval(projectId: string, userId: string, comments?: string) {
  const budget = await prisma.budget.findUnique({ where: { projectId } });
  if (!budget) {
    throw new AppError(404, "Budget not found");
  }

  if (budget.status === BudgetStatus.PENDING_APPROVAL) {
    throw new AppError(400, "Budget approval is already pending");
  }

  if (budget.status === BudgetStatus.APPROVED) {
    throw new AppError(400, "Budget is already approved");
  }

  // Update status to PENDING
  await prisma.budget.update({
    where: { projectId },
    data: { status: BudgetStatus.PENDING_APPROVAL },
  });

  // Create approval request
  return createApprovalRequest(
    ApprovalType.BUDGET_APPROVAL,
    projectId,
    userId,
    comments
  );
}

export async function createDraftBudget(data: { projectId: string; currency: string; items: any[] }) {
  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

  return prisma.$transaction(async (tx) => {
    // Delete existing items first if budget exists (to replace with new draft items)
    // We can't easily check existence inside the upsert perfectly for child deletions without a separate query or loose approach.
    // Instead: find budgetId first or just use deleteMany on items where budget matches project.
    
    // 1. Find budget if exists
    const existingBudget = await tx.budget.findUnique({ where: { projectId: data.projectId } });
    
    if (existingBudget) {
       await tx.budgetItem.deleteMany({ where: { budgetId: existingBudget.id } });
    }

    // 2. Upsert budget header
    const budget = await tx.budget.upsert({
      where: { projectId: data.projectId },
      update: {
        totalAmount,
        currency: data.currency,
        status: BudgetStatus.DRAFT,
      },
      create: {
        projectId: data.projectId,
        totalAmount,
        currency: data.currency,
        status: BudgetStatus.DRAFT
      }
    });

    // Create new items
    if (data.items.length > 0) {
      await tx.budgetItem.createMany({
        data: data.items.map(item => ({
          budgetId: budget.id,
          category: item.category,
          description: item.description,
          amount: item.amount
        }))
      });
    }

    return getBudget(data.projectId);
  });
}

export function getBudget(projectId: string) {
  return prisma.budget.findUnique({ 
    where: { projectId },
    include: { items: true } // Include items
  });
}

// Fix #4: Wrap expense operations in transaction
export async function addExpense(data: {
  projectId: string;
  taskId?: string;
  materialId?: string;
  createdById: string;
  amount: number;
  category: string;
  description?: string;
  expenseType: ExpenseType;
  expenseDate?: Date;
  status?: ExpenseStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        projectId: data.projectId,
        taskId: data.taskId,
        materialId: data.materialId,
        createdById: data.createdById,
        amount: data.amount,
        category: data.category,
        description: data.description,
        expenseType: data.expenseType,
        expenseDate: data.expenseDate,
        status: data.status ?? ExpenseStatus.PENDING,
      },
    });

    // Recalculate remaining in same transaction
    await recalcRemainingTx(tx, data.projectId);
    return expense;
  });
}

// Fix #8 & #13: Add pagination and date filtering
export interface ListExpensesParams {
  projectId: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function listExpenses(params: ListExpensesParams) {
  const { projectId, page = 1, limit = 50, startDate, endDate } = params;
  const skip = (page - 1) * limit;

  const where: any = { projectId };
  
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) {
      where.expenseDate.gte = startDate;
    }
    if (endDate) {
      where.expenseDate.lte = endDate;
    }
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip,
      take: limit,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Fix #4: Transaction-safe recalculation helper
async function recalcRemainingTx(tx: any, projectId: string) {
  const totals = await tx.expense.aggregate({
    _sum: { amount: true },
    where: { projectId },
  });
  const spent = Number(totals._sum.amount ?? 0);
  const budget = await tx.budget.findUnique({ where: { projectId } });
  if (!budget) return;
  const remaining = Number(budget.totalAmount) - spent;
  await tx.budget.update({
    where: { projectId },
    data: { remainingAmount: remaining },
  });
}

// Legacy function for backward compatibility (non-transaction)
async function _recalcRemaining(projectId: string) {
  return prisma.$transaction(async (tx) => {
    await recalcRemainingTx(tx, projectId);
  });
}

// Fix #4: Wrap update in transaction
export function updateExpense(expenseId: string, data: Partial<{ amount: number; category: string; description?: string; expenseType: ExpenseType; expenseDate?: Date }>) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        ...data,
        expenseDate: data.expenseDate,
      },
    });
    await recalcRemainingTx(tx, expense.projectId);
    return expense;
  });
}

// Fix #12: Optimized delete - single query with return, then recalc
export function deleteExpense(expenseId: string) {
  return prisma.$transaction(async (tx) => {
    // Delete and get the expense in one operation
    const expense = await tx.expense.delete({ where: { id: expenseId } });
    await recalcRemainingTx(tx, expense.projectId);
    return { success: true };
  });
}

// Get expense by ID (for ownership check in router)
export function getExpenseById(expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      id: true,
      projectId: true,
      createdById: true,
      status: true
    },
  });
}

export async function getFinancialAnalytics(projectId: string) {
  const budget = await prisma.budget.findUnique({ 
    where: { projectId },
    include: { items: true }
  });
  if (!budget) {
    return {
      budget: null,
      totalSpent: 0,
      remaining: 0,
      expensesByType: {},
      expensesByCategory: {},
      recentExpenses: [],
    };
  }

  const expenses = await prisma.expense.findMany({
    where: { projectId },
    orderBy: { expenseDate: "desc" },
    take: 10,
  });

  const totals = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { projectId, status: ExpenseStatus.APPROVED },
  });

  const byType = await prisma.expense.groupBy({
    by: ["expenseType"],
    where: { projectId, status: ExpenseStatus.APPROVED },
    _sum: { amount: true },
  });

  const byCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: { projectId, status: ExpenseStatus.APPROVED },
    _sum: { amount: true },
  });

  const totalSpent = Number(totals._sum.amount ?? 0);
  const remaining = Number(budget.totalAmount) - totalSpent;

  return {
    budget: {
      totalAmount: Number(budget.totalAmount),
      remainingAmount: remaining,
      currency: budget.currency,
      status: budget.status,
      items: budget.items,
    },
    totalSpent,
    remaining,
    expensesByType: byType.reduce((acc, item) => {
      acc[item.expenseType] = Number(item._sum.amount ?? 0);
      return acc;
    }, {} as Record<string, number>),
    expensesByCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = Number(item._sum.amount ?? 0);
      return acc;
    }, {} as Record<string, number>),
    recentExpenses: expenses.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      expenseType: e.expenseType,
      expenseDate: e.expenseDate,
    })),
  };
}
