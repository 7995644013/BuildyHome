import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { checkProjectAccess } from "../../shared/guards/projectAccessGuard";
import { UserRole } from "@prisma/client";
import { createMaterialSchema, updateMaterialSchema } from "./material.schema";
import {
  createMaterial,
  deleteMaterial,
  getMaterial,
  listMaterials,
  updateMaterial,
  updateMaterialQuantity,
} from "./material.service";

const router = Router();

router.use(authGuard);

// List all materials (optionally filter by project)
router.get("/", async (req, res, next) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    
    // If projectId provided, check access
    if (projectId) {
      const userId = (req as AuthenticatedRequest).user!.id;
      const hasAccess = await checkProjectAccess(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    const materials = await listMaterials(projectId);
    res.json(materials);
  } catch (err) {
    next(err);
  }
});

// Get material by ID
router.get("/:id", async (req, res, next) => {
  try {
    const material = await getMaterial(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    
    // Check project access if material belongs to a project
    if (material.projectId) {
      const userId = (req as AuthenticatedRequest).user!.id;
      const hasAccess = await checkProjectAccess(userId, material.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    res.json(material);
  } catch (err) {
    next(err);
  }
});

// Create material (admin, PM only)
router.post(
  "/",
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      const data = createMaterialSchema.parse(req.body);
      
      // Check project access if projectId provided
      if (data.projectId) {
        const userId = (req as AuthenticatedRequest).user!.id;
        const hasAccess = await checkProjectAccess(userId, data.projectId);
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied to this project" });
        }
      }
      
      const material = await createMaterial(data);
      res.status(201).json(material);
    } catch (err) {
      next(err);
    }
  }
);

// Update material (admin, PM only)
router.put(
  "/:id",
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      const data = updateMaterialSchema.parse(req.body);
      const material = await updateMaterial(req.params.id, data);
      res.json(material);
    } catch (err) {
      next(err);
    }
  }
);

// Update material quantity (for inventory management)
router.patch(
  "/:id/quantity",
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager, UserRole.site_engineer]),
  async (req, res, next) => {
    try {
      const { change } = req.body;
      if (typeof change !== "number") {
        return res.status(400).json({ error: "Change must be a number" });
      }
      const material = await updateMaterialQuantity(req.params.id, change);
      res.json(material);
    } catch (err) {
      next(err);
    }
  }
);

// Delete material (admin, PM only)
router.delete(
  "/:id",
  roleGuard([UserRole.super_admin, UserRole.admin, UserRole.project_manager]),
  async (req, res, next) => {
    try {
      await deleteMaterial(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export { router as materialRouter };
