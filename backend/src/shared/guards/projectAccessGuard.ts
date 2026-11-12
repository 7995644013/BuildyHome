import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./authGuard";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { UserRole } from "@prisma/client";

/**
 * Middleware to verify user has access to a specific project
 * Prevents horizontal privilege escalation (User A accessing Project B's data)
 * 
 * Usage:
 * router.get("/projects/:projectId/tasks", projectAccessGuard, ...)
 * 
 * The projectId can come from:
 * - URL params: req.params.projectId
 * - Query params: req.query.projectId
 * - Body: req.body.projectId
 */
export function projectAccessGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Extract projectId from various sources
  const projectId = 
    req.params.projectId || 
    req.params.id || 
    req.query.projectId || 
    req.body.projectId;

  if (!projectId) {
    return res.status(400).json({ error: "Project ID is required" });
  }

  // Check access asynchronously
  checkProjectAccess(req.user.id, projectId)
    .then((hasAccess) => {
      if (!hasAccess) {
        logger.warn("Project access denied", {
          userId: req.user!.id,
          projectId,
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({ 
          error: "Access denied: You don't have permission to access this project" 
        });
      }
      next();
    })
    .catch((error) => {
      logger.error("Error checking project access", {
        error: error.message,
        userId: req.user!.id,
        projectId,
      });
      res.status(500).json({ error: "Internal server error" });
    });
}

/**
 * Check if user has access to a project
 * Returns true if:
 * 1. User is super_admin or admin (full access)
 * 2. User is assigned to project via ProjectAssignment
 * 3. User is the project manager
 * 4. User is the client for the project
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  // Get user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return false;
  }

  // Super admin and admin have access to all projects
  if (user.role === UserRole.super_admin || user.role === UserRole.admin) {
    return true;
  }

  // Check if user has direct assignment
  const assignment = await prisma.projectAssignment.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (assignment) {
    return true;
  }

  // Check if user is project manager
  const projectAsManager = await prisma.project.findFirst({
    where: {
      id: projectId,
      projectManagerId: userId,
    },
  });

  if (projectAsManager) {
    return true;
  }

  // Check if user is client
  const projectAsClient = await prisma.project.findFirst({
    where: {
      id: projectId,
      clientId: userId,
    },
  });

  if (projectAsClient) {
    return true;
  }

  return false;
}

/**
 * Helper function to get user's accessible project IDs
 */
export async function getUserProjectIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return [];
  }

  // Super admin and admin have access to all projects
  if (user.role === "super_admin" || user.role === "admin") {
    const allProjects = await prisma.project.findMany({
      select: { id: true },
    });
    return allProjects.map(p => p.id);
  }

  // Get assigned projects
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    select: { projectId: true },
  });

  // Get managed projects
  const managedProjects = await prisma.project.findMany({
    where: { projectManagerId: userId },
    select: { id: true },
  });

  // Get client projects
  const clientProjects = await prisma.project.findMany({
    where: { clientId: userId },
    select: { id: true },
  });

  // Combine and deduplicate
  const projectIds = new Set<string>();
  assignments.forEach((a: { projectId: string }) => projectIds.add(a.projectId));
  managedProjects.forEach((p: { id: string }) => projectIds.add(p.id));
  clientProjects.forEach((p: { id: string }) => projectIds.add(p.id));

  return Array.from(projectIds);
}

