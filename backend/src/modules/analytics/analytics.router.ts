import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { getDashboardStats } from "./analytics.service";

const router = Router();

router.use(authGuard);

router.get("/dashboard", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const userRole = (req as AuthenticatedRequest).user!.role;
    const stats = await getDashboardStats(userId, userRole);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export { router as analyticsRouter };

