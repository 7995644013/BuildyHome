import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { projectAccessGuard } from "../../shared/guards/projectAccessGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { UserRole } from "@prisma/client";
import { createReportSchema, updateReportSchema } from "./report.schema";
import { createReport, deleteReport, getReport, listProjectReports, updateReport } from "./report.service";

const router = Router();

router.use(authGuard);

// List reports for a project
router.get("/projects/:projectId/reports", projectAccessGuard, async (req, res, next) => {
  try {
    const reports = await listProjectReports(req.params.projectId);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// Get report by ID
router.get("/:id", async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Create report
router.post("/projects/:projectId/reports", projectAccessGuard, async (req, res, next) => {
  try {
    const data = createReportSchema.parse(req.body);
    const report = await createReport({
      projectId: req.params.projectId,
      createdById: (req as AuthenticatedRequest).user!.id,
      reportDate: data.reportDate instanceof Date ? data.reportDate : new Date(data.reportDate),
      workDone: data.workDone,
      issues: data.issues,
      nextSteps: data.nextSteps,
    });
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// Update report (only creator or admin)
router.put("/:id", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]), async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    // Check if user is creator or admin
    const user = (req as AuthenticatedRequest).user!;
    if (report.createdById !== user.id && user.role !== "super_admin" && user.role !== "admin") {
      return res.status(403).json({ error: "You can only edit your own reports" });
    }

    const data = updateReportSchema.parse(req.body);
    const updatedReport = await updateReport(req.params.id, {
      reportDate: data.reportDate instanceof Date ? data.reportDate : data.reportDate ? new Date(data.reportDate) : undefined,
      workDone: data.workDone,
      issues: data.issues,
      nextSteps: data.nextSteps,
    });
    res.json(updatedReport);
  } catch (err) {
    next(err);
  }
});

// Delete report (only creator or admin)
router.delete("/:id", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]), async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    // Check if user is creator or admin
    const user = (req as AuthenticatedRequest).user!;
    if (report.createdById !== user.id && user.role !== "super_admin" && user.role !== "admin") {
      return res.status(403).json({ error: "You can only delete your own reports" });
    }

    await deleteReport(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as reportRouter };

