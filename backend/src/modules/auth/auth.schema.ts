import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  role: z.enum(["client", "site_engineer", "project_manager", "admin", "super_admin"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["client", "site_engineer", "project_manager", "admin"]),
  initialPassword: z.string().min(8),
  projectIds: z.array(z.string().uuid()).optional(), // Optional: assign to projects immediately
});

// OTP-based password reset schemas
export const sendResetOtpSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Email verification schemas
export const verifyEmailSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});
