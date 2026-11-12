import { Router } from "express";
import { authGuard } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { UserRole } from "@prisma/client";
import { addTeamMemberSchema, createTeamSchema, updateTeamSchema } from "./team.schema";
import { addTeamMember, assignTeamToProject, createTeam, deleteTeam, getTeam, listProjectTeams, listTeams, removeTeamFromProject, removeTeamMember, updateTeam } from "./team.service";

const router = Router();

router.use(authGuard);

// List all teams
router.get("/", async (_req, res, next) => {
  try {
    const teams = await listTeams();
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

// Get team by ID
router.get("/:id", async (req, res, next) => {
  try {
    const team = await getTeam(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (err) {
    next(err);
  }
});

// Create team (admin and project_manager only)
router.post("/", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = createTeamSchema.parse(req.body);
    const team = await createTeam(data);
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
});

// Update team (admin and project_manager only)
router.put("/:id", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = updateTeamSchema.parse(req.body);
    const team = await updateTeam(req.params.id, data);
    res.json(team);
  } catch (err) {
    next(err);
  }
});

// Delete team (admin and project_manager only)
router.delete("/:id", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    await deleteTeam(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Add member to team
router.post("/:id/members", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const data = addTeamMemberSchema.parse(req.body);
    const member = await addTeamMember(req.params.id, data.userId, data.role);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

// Remove member from team
router.delete("/:id/members/:userId", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    await removeTeamMember(req.params.id, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Assign team to project
router.post("/:id/projects/:projectId", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const assignment = await assignTeamToProject(req.params.id, req.params.projectId);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

// Remove team from project
router.delete("/:id/projects/:projectId", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    await removeTeamFromProject(req.params.id, req.params.projectId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// List teams assigned to a project
router.get("/projects/:projectId/teams", roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]), async (req, res, next) => {
  try {
    const teams = await listProjectTeams(req.params.projectId);
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

export { router as teamRouter };
