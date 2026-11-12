import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { UserRole } from "@prisma/client";
import { createApprovalSchema, respondApprovalSchema } from "./approval.schema";
import { createApprovalRequest, getApprovals, respondToApproval, getApprovalHistory } from "./approval.service";

const router = Router();

router.use(authGuard);

// Create Approval Request (Project Manager)
router.post("/", roleGuard([UserRole.project_manager, UserRole.admin, UserRole.super_admin]), async (req, res, next) => {
  try {
    const data = createApprovalSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    const approval = await createApprovalRequest(data.type, data.targetId, userId, data.comments);
    res.status(201).json(approval);
  } catch (err) {
    next(err);
  }
});

// Respond to Approval (Super Admin)
router.patch("/:id/respond", roleGuard([UserRole.super_admin]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = respondApprovalSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    const approval = await respondToApproval(id, userId, data.status, data.comments);
    res.status(200).json(approval);
  } catch (err) {
    next(err);
  }
});

// List Approvals
router.get("/", async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const approvals = await getApprovals(user.role, user.id);
    res.status(200).json(approvals);
  } catch (err) {
    next(err);
  }
});

// Get Approval History for a Target
router.get("/history/:targetId", async (req, res, next) => {
  try {
    const { targetId } = req.params;
    // Optional: Add check if user has access to this target (context dependent)
    // For now, allow authenticated users involved to see history
    const history = await getApprovalHistory(targetId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export { router as approvalRouter };
