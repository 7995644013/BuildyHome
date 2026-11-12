import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { projectAccessGuard, checkProjectAccess } from "../../shared/guards/projectAccessGuard";
import { UserRole, ExpenseStatus, ApprovalType } from "@prisma/client";
import { expenseSchema, updateExpenseSchema, listExpensesQuerySchema } from "./budget.schema";
import { addExpense, deleteExpense, getBudget, getExpenseById, getFinancialAnalytics, listExpenses, updateExpense } from "./budget.service";
import { createApprovalRequest } from "../approvals/approval.service";

const router = Router();

router.use(authGuard);

// Save Draft Budget (PM)
router.post("/projects/:projectId/budget/draft", projectAccessGuard, roleGuard([UserRole.project_manager, UserRole.admin]), async (req, res, next) => {
  try {
    const { draftBudgetSchema } = await import("./budget.schema");
    const { createDraftBudget } = await import("./budget.service");
    
    // Validate request
    const data = draftBudgetSchema.parse({ ...req.body, projectId: req.params.projectId });
    
    const budget = await createDraftBudget(data);
    res.status(200).json(budget);
  } catch (err) {
    next(err);
  }
});

router.post("/projects/:projectId/budget/approval", projectAccessGuard, roleGuard([UserRole.project_manager, UserRole.admin]), async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const result = await import("./budget.service").then(s => s.submitBudgetForApproval(req.params.projectId, userId, req.body?.comments));
    res.status(200).json(result);
  } catch (err) {
    console.error("Budget submission error:", err);
    next(err);
  }
});

// Get Pending Approval for Budget
router.get("/projects/:projectId/budget/pending-approval", projectAccessGuard, roleGuard([UserRole.project_manager, UserRole.admin, UserRole.super_admin]), async (req, res, next) => {
  try {
     const approval = await import("../../modules/approvals/approval.service").then(s => 
        s.getPendingApprovalForTarget(req.params.projectId, "BUDGET_APPROVAL")
     );
     res.json(approval || null);
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/budget", projectAccessGuard, async (req, res, next) => {
  try {
    const budget = await getBudget(req.params.projectId);
    res.json(budget);
  } catch (err) {
    next(err);
  }
});

// Fix #2: Add roleGuard to expense create
// Fix #2: Add roleGuard to expense create
router.post("/expenses", roleGuard([UserRole.admin, UserRole.project_manager, UserRole.super_admin]), async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    const role = (req as AuthenticatedRequest).user!.role;

    // Verify project access before creating expense
    const hasAccess = await checkProjectAccess(userId, data.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied: You don't have permission to access this project" });
    }

    // Determine status: PM -> PENDING, Admin -> APPROVED
    const status = (role === 'admin' || role === 'super_admin') ? ExpenseStatus.APPROVED : ExpenseStatus.PENDING;

    const expense = await addExpense({
      ...data,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
      createdById: userId,
      status
    });

    // If pending, create approval request
    if (status === ExpenseStatus.PENDING) {
       await createApprovalRequest(ApprovalType.EXPENSE_APPROVAL, expense.id, userId);
    }

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

// Fix #8 & #13: Add pagination and date filtering to list expenses
router.get("/projects/:projectId/expenses", projectAccessGuard, async (req, res, next) => {
  try {
    const query = listExpensesQuerySchema.parse(req.query);
    const result = await listExpenses({
      projectId: req.params.projectId,
      page: query.page,
      limit: query.limit,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Fix #2 & #3: Add roleGuard and ownership check to expense update
router.put("/expenses/:id", roleGuard([UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = updateExpenseSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    const userRole = (req as AuthenticatedRequest).user!.role;

    // Get expense to check project access and ownership
    const expense = await getExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Check project access
    const hasAccess = await checkProjectAccess(userId, expense.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied: You don't have permission to access this project" });
    }

    // Fix #3: Ownership check - allow if admin, or if user created the expense
    if (userRole !== UserRole.admin && expense.createdById !== userId) {
      return res.status(403).json({ error: "Access denied: You can only edit expenses you created" });
    }

    // Fix: Block editing if approved (Strict Approval Flow)
    if (expense.status === ExpenseStatus.APPROVED) {
        return res.status(403).json({ error: "Cannot edit an approved expense" });
    }

    const updatedExpense = await updateExpense(req.params.id, {
      ...data,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
    });
    res.json(updatedExpense);
  } catch (err) {
    next(err);
  }
});

// Fix #2 & #3: Add roleGuard and ownership check to expense delete
router.delete("/expenses/:id", roleGuard([UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const userRole = (req as AuthenticatedRequest).user!.role;

    // Get expense to check project access and ownership
    const expense = await getExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Check project access
    const hasAccess = await checkProjectAccess(userId, expense.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied: You don't have permission to access this project" });
    }

    // Fix #3: Ownership check - allow if admin, or if user created the expense
    if (userRole !== UserRole.admin && expense.createdById !== userId) {
      return res.status(403).json({ error: "Access denied: You can only delete expenses you created" });
    }

    // Fix: Block deletion if approved (Strict Approval Flow)
    if (expense.status === ExpenseStatus.APPROVED) {
        return res.status(403).json({ error: "Cannot delete an approved expense" });
    }

    await deleteExpense(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectId/analytics", projectAccessGuard, async (req, res, next) => {
  try {
    const analytics = await getFinancialAnalytics(req.params.projectId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

export { router as budgetRouter };
