import { Router } from "express";
import { AuthenticatedRequest, authGuard } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { assignUserToProjectSchema, assignUserToProjectsSchema, updateProfileSchema, updateRoleSchema, updateUserSchema } from "./user.schema";
import { assignUserToProject, assignUserToProjects, getCurrentUser, getUserById, getUserProjects, listUsers, removeUserFromProject, restoreUser, softDeleteUser, updateProfile, updateProjectAssignment, updateUser, updateUserRole } from "./user.service";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authGuard);

router.get("/me", async (req, res, next) => {
  try {
    const user = await getCurrentUser((req as AuthenticatedRequest).user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put("/me", async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await updateProfile((req as AuthenticatedRequest).user!.id, data);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const role = req.query.role as string | undefined;
    const users = await listUsers(role);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Specific routes must come before generic :id route
router.put("/:id/role", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = updateRoleSchema.parse(req.body);
    const user = await updateUserRole(req.params.id, data.role as UserRole);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", roleGuard([UserRole.super_admin, UserRole.admin]), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id, data);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Soft delete (deactivate) user
router.delete("/:id", roleGuard([UserRole.super_admin, UserRole.admin]), async (req, res, next) => {
  try {
    const user = await softDeleteUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Restore (reactivate) user
router.post("/:id/restore", roleGuard([UserRole.super_admin, UserRole.admin]), async (req, res, next) => {
  try {
    const user = await restoreUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/me/projects", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const projects = await getUserProjects(userId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// Admin/PM: Assign user to project(s) - Super Admin does onboarding, but PM assigns
router.post("/assign-project", roleGuard([UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = assignUserToProjectSchema.parse(req.body);
    const assignedBy = (req as AuthenticatedRequest).user!.id;
    const assignment = await assignUserToProject(data.userId, data.projectId, data.role, assignedBy);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

router.post("/assign-projects", roleGuard([UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = assignUserToProjectsSchema.parse(req.body);
    const assignedBy = (req as AuthenticatedRequest).user!.id;
    await assignUserToProjects(data.userId, data.projectIds, data.role, assignedBy);
    res.status(201).json({ success: true, message: "User assigned to projects" });
  } catch (err) {
    next(err);
  }
});

// Update project assignment role
router.put("/:userId/projects/:projectId", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Role is required" });
    const assignment = await updateProjectAssignment(req.params.userId, req.params.projectId, role);
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

router.delete("/:userId/projects/:projectId", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    await removeUserFromProject(req.params.userId, req.params.projectId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
