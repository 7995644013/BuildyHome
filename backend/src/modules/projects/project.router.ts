import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { projectAccessGuard } from "../../shared/guards/projectAccessGuard";
import { UserRole } from "@prisma/client";
import { createProjectSchema, landInfoSchema, updateProjectSchema } from "./project.schema";
import { createProject, deleteProject, getLandInfo, getProject, listProjects, restoreProject, updateProject, upsertLandInfo } from "./project.service";

const router = Router();

router.use(authGuard);

// Create: Only Admin/PM (Super Admin cannot create)
router.post("/", roleGuard([UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const currentUser = (req as AuthenticatedRequest).user!;
    const isAdmin = currentUser.role === UserRole.super_admin || currentUser.role === UserRole.admin;

    // Determine Project Manager ID:
    // - If admin/super_admin: must provide projectManagerId
    // - If project_manager: automatically use their own ID
    let projectManagerId: string;

    if (isAdmin) {
      if (!data.projectManagerId) {
        return res.status(400).json({ error: "Project Manager is required when creating a project as Admin" });
      }
      projectManagerId = data.projectManagerId;
    } else {
      // Project Manager creating their own project
      projectManagerId = currentUser.id;
    }

    const project = await createProject({
      ...data,
      projectManagerId,
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const projects = await listProjects({ includeDeleted });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// Specific routes must come before generic :id route
router.post("/:id/land-info", projectAccessGuard, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = landInfoSchema.parse(req.body);
    const landInfo = await upsertLandInfo(req.params.id, data);
    res.status(201).json(landInfo);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/land-info", projectAccessGuard, async (req, res, next) => {
  try {
    const landInfo = await getLandInfo(req.params.id);
    if (!landInfo) return res.json({});
    res.json(landInfo);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", projectAccessGuard, async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const project = await getProject(req.params.id, includeDeleted);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", projectAccessGuard, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    const project = await updateProject(req.params.id, data);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", projectAccessGuard, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const project = await deleteProject(req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/restore", projectAccessGuard, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const project = await restoreProject(req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

export { router as projectRouter };

