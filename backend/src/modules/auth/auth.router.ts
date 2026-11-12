import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { UserRole } from "@prisma/client";
import { 
  adminCreateUserSchema, 
  changePasswordSchema, 
  loginSchema, 
  refreshSchema, 
  registerSchema,
  sendResetOtpSchema,
  resetPasswordWithOtpSchema,
  verifyEmailSchema,
} from "./auth.schema";
import { 
  changePassword, 
  loginUser, 
  refreshSession,
  sendResetOtp,
  resetPasswordWithOtp,
  sendVerifyOtp,
  verifyEmail,
  adminCreateUserWithEmail,
  registerUserWithEmail,
} from "./auth.service";

const router = Router();

// Public routes
router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUserWithEmail(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data.email, data.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const data = refreshSchema.parse(req.body);
    const tokens = await refreshSession(data.refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (_req, res) => {
  // Stateless JWT logout: client should discard tokens
  res.status(200).json({ success: true });
});

// Password reset routes
router.post("/send-reset-otp", async (req, res, next) => {
  try {
    const data = sendResetOtpSchema.parse(req.body);
    const result = await sendResetOtp(data.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const data = resetPasswordWithOtpSchema.parse(req.body);
    const result = await resetPasswordWithOtp(
      data.email,
      data.otp,
      data.newPassword
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Protected routes
router.use(authGuard);

// Change password (for first-time login or regular password change)
router.put("/password", async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    await changePassword(userId, data.currentPassword, data.newPassword);
    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
});

// Email verification routes (protected)
router.post("/send-verify-otp", async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const result = await sendVerifyOtp(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const data = verifyEmailSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    const result = await verifyEmail(userId, data.otp);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Onboarding: Only Super Admin
router.post("/admin/users", roleGuard([UserRole.super_admin]), async (req, res, next) => {
  try {
    const data = adminCreateUserSchema.parse(req.body);
    const createdById = (req as AuthenticatedRequest).user!.id;
    const user = await adminCreateUserWithEmail({
      ...data,
      createdById,
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
