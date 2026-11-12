import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["client", "site_engineer", "project_manager", "admin", "super_admin"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  designation: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["client", "site_engineer", "project_manager", "admin", "super_admin"]).optional(),
});

export const assignUserToProjectSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.string().optional(), // Optional role within project
});

export const assignUserToProjectsSchema = z.object({
  userId: z.string().uuid(),
  projectIds: z.array(z.string().uuid()),
  role: z.string().optional(),
});
