import { Router } from "express";
import { Response } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { projectAccessGuard } from "../../shared/guards/projectAccessGuard";
import { UserRole, Prisma } from "@prisma/client";
import {
  approveTaskSchema,
  createTaskSchema,
  taskCommentSchema,
  taskPhotoSchema,
  updateTaskSchema,
} from "./task.schema";
import {
  addTaskComment,
  addTaskPhoto,
  approveTask,
  createTask,
  deleteTask,
  deleteTaskComment,
  deleteTaskPhoto,
  getArbitration,
  getTask,
  getTaskComment,
  getTaskComments,
  getTaskPhotos,
  listArbitrations,
  listProjectTasks,
  restoreTask,
  resolveArbitration,
  updateTask,
  updateTaskComment,
  updateTaskPhoto,
} from "./task.service";
import { NextFunction } from "express";
import { prisma } from "../../config/database";

const router = Router();

router.use(authGuard);

router.post(
  "/",
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      const data = createTaskSchema.parse(req.body);
      // Verify project access before creating task
      const { checkProjectAccess } =
        await import("../../shared/guards/projectAccessGuard");
      const hasAccess = await checkProjectAccess(
        (req as AuthenticatedRequest).user!.id,
        data.projectId
      );
      if (!hasAccess) {
        return res
          .status(403)
          .json({
            error:
              "Access denied: You don't have permission to access this project",
          });
      }
      const currentUserId = (req as AuthenticatedRequest).user!.id;
      const task = await createTask({
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdById: currentUserId,
      });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }
);

// List all tasks (with optional filters)
router.get("/", async (req, res, next) => {
  try {
    const { status, projectId, assigneeId, limit, orderBy } = req.query;
    const userId = (req as AuthenticatedRequest).user!.id;
    const userRole = (req as AuthenticatedRequest).user!.role;

    const where: any = { isDeleted: false }; // Exclude deleted tasks by default
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    
    // Allow including deleted tasks if explicitly requested
    if (req.query.includeDeleted === "true") {
      delete where.isDeleted;
    }

    // For non-admin users, filter by accessible projects
    if (userRole !== UserRole.super_admin && userRole !== UserRole.admin) {
      const userProjects = await prisma.projectAssignment.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const managedProjects = await prisma.project.findMany({
        where: { projectManagerId: userId },
        select: { id: true },
      });
      const clientProjects = await prisma.project.findMany({
        where: { clientId: userId },
        select: { id: true },
      });

      const accessibleProjectIds = [
        ...userProjects.map((p) => p.projectId),
        ...managedProjects.map((p) => p.id),
        ...clientProjects.map((p) => p.id),
      ];

      if (accessibleProjectIds.length === 0) {
        // User has no accessible projects, return empty array
        return res.json([]);
      }

      // If a specific projectId is requested, verify it's accessible and use it
      // Otherwise, filter by all accessible projects
      if (projectId) {
        if (!accessibleProjectIds.includes(projectId as string)) {
          // User doesn't have access to this project
          return res.json([]);
        }
        where.projectId = projectId;
      } else {
        where.projectId = { in: accessibleProjectIds };
      }
    } else {
      // Admins can see all tasks, but still respect projectId filter if provided
      if (projectId) where.projectId = projectId;
    }

    const orderByField: Prisma.TaskOrderByWithRelationInput =
      orderBy === "updatedAt" 
        ? { updatedAt: Prisma.SortOrder.desc } 
        : { createdAt: Prisma.SortOrder.desc };
    const takeLimit = limit ? parseInt(limit as string, 10) : undefined;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: orderByField,
      take: takeLimit,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            referenceNumber: true,
          },
        },
      },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get(
  "/project/:projectId",
  projectAccessGuard,
  async (req, res, next) => {
    try {
      const tasks = await listProjectTasks(req.params.projectId);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  }
);

// Helper middleware to check project access via task
async function checkTaskProjectAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Allow access to deleted tasks for restore operations
    const includeDeleted = req.method === "POST" && req.path.endsWith("/restore");
    const task = await getTask(req.params.id, includeDeleted);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    const { checkProjectAccess } =
      await import("../../shared/guards/projectAccessGuard");
    const hasAccess = await checkProjectAccess(req.user!.id, task.projectId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({
          error:
            "Access denied: You don't have permission to access this project",
        });
    }
    // Attach projectId to request for downstream use
    (req as any).projectId = task.projectId;
    next();
  } catch (err) {
    next(err);
  }
}

// Specific routes must come before generic :id route
router.post("/:id/photos", checkTaskProjectAccess, async (req, res, next) => {
  try {
    const data = taskPhotoSchema.parse(req.body);
    const photo = await addTaskPhoto(req.params.id, data);
    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/photos", checkTaskProjectAccess, async (req, res, next) => {
  try {
    const photos = await getTaskPhotos(req.params.id);
    res.json(photos);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/photos/:photoId", checkTaskProjectAccess, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]), async (req, res, next) => {
  try {
    await deleteTaskPhoto(req.params.photoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/comments", checkTaskProjectAccess, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]), async (req, res, next) => {
  try {
    const data = taskCommentSchema.parse(req.body);
    const comment = await addTaskComment(
      req.params.id,
      (req as AuthenticatedRequest).user!.id,
      data.content
    );
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/comments", checkTaskProjectAccess, roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]), async (req, res, next) => {
  try {
    const comments = await getTaskComments(req.params.id);
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/approve",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      const data = approveTaskSchema.parse(req.body);
      const task = await approveTask(req.params.id, data);
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/resolve-arbitration",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin]),
  async (req, res, next) => {
    try {
      const { resolution } = req.body;
      if (resolution !== "approve" && resolution !== "reject") {
        return res
          .status(400)
          .json({ error: "Resolution must be 'approve' or 'reject'" });
      }
      const task = await resolveArbitration(
        req.params.id,
        resolution,
        (req as AuthenticatedRequest).user!.id
      );
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id", checkTaskProjectAccess, async (req, res, next) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:id",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      const data = updateTaskSchema.parse(req.body);
      const task = await updateTask(req.params.id, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      const task = await deleteTask(req.params.id);
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/restore",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      const task = await restoreTask(req.params.id);
      res.json(task);
    } catch (err) {
      next(err);
    }
  }
);

// Update task comment
router.put(
  "/:id/comments/:commentId",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      
      // Check ownership
      const comment = await getTaskComment(req.params.commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      
      const userId = (req as AuthenticatedRequest).user!.id;
      const userRole = (req as AuthenticatedRequest).user!.role;
      if (comment.userId !== userId && userRole !== UserRole.super_admin && userRole !== UserRole.admin) {
        return res.status(403).json({ error: "You can only edit your own comments" });
      }
      
      const updated = await updateTaskComment(req.params.commentId, content);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Delete task comment
router.delete(
  "/:id/comments/:commentId",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      // Check ownership
      const comment = await getTaskComment(req.params.commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      
      const userId = (req as AuthenticatedRequest).user!.id;
      const userRole = (req as AuthenticatedRequest).user!.role;
      if (comment.userId !== userId && userRole !== UserRole.super_admin && userRole !== UserRole.admin) {
        return res.status(403).json({ error: "You can only delete your own comments" });
      }
      
      await deleteTaskComment(req.params.commentId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// Update task photo caption
router.put(
  "/:id/photos/:photoId",
  checkTaskProjectAccess,
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      const { caption } = req.body;
      const photo = await updateTaskPhoto(req.params.photoId, caption || "");
      res.json(photo);
    } catch (err) {
      next(err);
    }
  }
);

// Get arbitrations list
router.get(
  "/arbitrations",
  roleGuard([UserRole.super_admin, UserRole.admin]),
  async (req, res, next) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const arbitrations = await listArbitrations(projectId);
      res.json(arbitrations);
    } catch (err) {
      next(err);
    }
  }
);

// Get arbitration for a task
router.get(
  "/:id/arbitration",
  checkTaskProjectAccess,
  async (req, res, next) => {
    try {
      const arbitration = await getArbitration(req.params.id);
      if (!arbitration) return res.status(404).json({ error: "No arbitration found" });
      res.json(arbitration);
    } catch (err) {
      next(err);
    }
  }
);

export { router as taskRouter };
