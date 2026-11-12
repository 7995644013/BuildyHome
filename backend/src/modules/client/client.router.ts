import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { projectAccessGuard } from "../../shared/guards/projectAccessGuard";
import { getClientProjectSummary } from "./client.service";

const router = Router();

router.use(authGuard);

router.get("/project-summary/:projectId", projectAccessGuard, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const projectId = req.params.projectId;
    const summary = await getClientProjectSummary(projectId, userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export { router as clientRouter };


