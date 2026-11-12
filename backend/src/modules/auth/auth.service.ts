import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { UserRole } from "@prisma/client";
import { logger } from "../../config/logger";
import { sendEmail } from "../../config/nodemailer";
import {
  welcomeEmailTemplate,
  newUserWelcomeTemplate,
  resetOtpTemplate,
  verifyEmailOtpTemplate,
} from "../../utils/emailTemplates";

const accessTokenTtl = "15m";
const refreshTokenTtl = "7d";

function getKeys() {
  const privateKey = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!privateKey || !publicKey) {
    throw new Error("JWT keys are not configured");
  }
  return { privateKey, publicKey };
}

/**
 * Admin creates user with initial password
 * User must change password on first login
 */
export async function adminCreateUser(params: {
  email: string;
  name: string;
  role: UserRole;
  initialPassword: string;
  projectIds?: string[];
  createdById: string;
}) {
  const hashedPassword = await argon2.hash(params.initialPassword);
  
  // Create user with passwordChangedAt = null (must change on first login)
  const user = await prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      role: params.role,
      hashedPassword,
      passwordChangedAt: null, // Must change on first login
      createdById: params.createdById,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  // Assign to projects if provided
  if (params.projectIds && params.projectIds.length > 0) {
    await prisma.projectAssignment.createMany({
      data: params.projectIds.map(projectId => ({
        userId: user.id,
        projectId,
        assignedBy: params.createdById,
      })),
      skipDuplicates: true,
    });
  }

  logger.info("Admin created user", {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdBy: params.createdById,
  });

  return user;
}

/**
 * Unified login - returns JWT tokens + user's project list
 */
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: {
      projectAssignments: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              referenceNumber: true,
              status: true,
            },
          },
        },
      },
      // Also include projects where user is project manager or client
      projects: {
        select: {
          id: true,
          name: true,
          referenceNumber: true,
          status: true,
        },
      },
      clientProjects: {
        select: {
          id: true,
          name: true,
          referenceNumber: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Account is inactive");
  }

  const valid = await argon2.verify(user.hashedPassword, password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  // Get all projects user has access to
  let allProjects: Array<{ id: string; name: string; referenceNumber: string; status: string }> = [];

  // Super admin and admin can see ALL projects
  if (user.role === UserRole.super_admin || user.role === UserRole.admin) {
    const allProjectsFromDb = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        referenceNumber: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    allProjects = allProjectsFromDb;
  } else {
    // For other roles, return only assigned/managed/client projects
    const assignedProjects = user.projectAssignments.map(pa => pa.project);
    const managedProjects = user.projects;
    const clientProjects = user.clientProjects;

    // Combine and deduplicate projects
    allProjects = [
      ...assignedProjects,
      ...managedProjects,
      ...clientProjects,
    ].reduce((acc: typeof assignedProjects, project) => {
      if (!acc.find((p: { id: string }) => p.id === project.id)) {
        acc.push(project);
      }
      return acc;
    }, [] as typeof assignedProjects);
  }

  const tokens = await issueTokens(user.id, user.role);

  logger.info("User logged in", {
    userId: user.id,
    email: user.email,
    role: user.role,
    projectCount: allProjects.length,
    mustChangePassword: !user.passwordChangedAt,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      mustChangePassword: !user.passwordChangedAt, // Flag for frontend
    },
    projects: allProjects,
    ...tokens,
  };
}

/**
 * Change password (for first-time login or regular password change)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password (unless it's first-time password change)
  if (user.passwordChangedAt) {
    const valid = await argon2.verify(user.hashedPassword, currentPassword);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }
  }

  // Hash new password
  const hashedPassword = await argon2.hash(newPassword);

  // Update password and set passwordChangedAt
  await prisma.user.update({
    where: { id: userId },
    data: {
      hashedPassword,
      passwordChangedAt: new Date(),
    },
  });

  logger.info("User changed password", {
    userId: user.id,
    email: user.email,
    wasFirstTime: !user.passwordChangedAt,
  });

  return { success: true };
}

export async function refreshSession(refreshToken: string) {
  const { publicKey } = getKeys();
  const payload = jwt.verify(refreshToken, publicKey, { algorithms: ["RS256"] }) as {
    sub: string;
    role: UserRole;
  };
  return issueTokens(payload.sub, payload.role);
}

async function issueTokens(userId: string, role: UserRole) {
  const { privateKey } = getKeys();
  const accessToken = jwt.sign({ role }, privateKey, {
    algorithm: "RS256",
    expiresIn: accessTokenTtl,
    subject: userId,
  });
  const refreshToken = jwt.sign({ role }, privateKey, {
    algorithm: "RS256",
    expiresIn: refreshTokenTtl,
    subject: userId,
  });
  return { accessToken, refreshToken };
}

// Legacy register function (keeping for backward compatibility)
export async function registerUser(params: {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}) {
  const hashedPassword = await argon2.hash(params.password);
  const user = await prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      role: params.role ?? UserRole.site_engineer,
      hashedPassword,
      passwordChangedAt: new Date(), // Self-registered users have changed password
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
  const tokens = await issueTokens(user.id, user.role);
  return { user, ...tokens };
}

/**
 * Send password reset OTP via email
 */
export async function sendResetOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal if user exists or not (security best practice)
  if (!user) {
    return {
      success: true,
      message: "If the email exists, OTP has been sent",
    };
  }

  if (!user.isActive) {
    throw new Error("Account is disabled. Contact administrator.");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Update user with OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtp: otp,
      resetOtpExpiresAt: expiresAt,
    },
  });

  // Send email asynchronously (non-blocking)
  const htmlBody = resetOtpTemplate(user.name || "User", otp);
  setImmediate(() => {
    sendEmail({
      to: email,
      subject: "Your password reset code",
      html: htmlBody,
      text: `Your password reset code is: ${otp}. This code expires in 15 minutes.`,
    }).catch((err) => {
      logger.error("Reset OTP email failed", { error: err, email });
    });
  });

  logger.info("Reset OTP generated and email queued", {
    userId: user.id,
    email,
  });

  return {
    success: true,
    message: "If the email exists, OTP has been sent",
  };
}

/**
 * Reset password using OTP
 */
export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("Invalid request");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled. Contact administrator.");
  }

  // Verify OTP
  if (!user.resetOtp || user.resetOtp !== otp) {
    throw new Error("Invalid or expired OTP");
  }

  if (!user.resetOtpExpiresAt || new Date() > user.resetOtpExpiresAt) {
    throw new Error("Invalid or expired OTP");
  }

  // Hash new password with argon2
  const hashedPassword = await argon2.hash(newPassword);

  // Update password and clear OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      passwordChangedAt: new Date(),
      resetOtp: null,
      resetOtpExpiresAt: null,
    },
  });

  logger.info("Password reset successful via OTP", {
    userId: user.id,
    email,
  });

  return {
    success: true,
    message: "Password reset successful. You can now login.",
  };
}

/**
 * Send email verification OTP
 */
export async function sendVerifyOtp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isEmailVerified) {
    throw new Error("Email already verified");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Update user with OTP
  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyOtp: otp,
      verifyOtpExpiresAt: expiresAt,
    },
  });

  // Send email asynchronously
  const htmlBody = verifyEmailOtpTemplate(user.name || "User", otp);
  setImmediate(() => {
    sendEmail({
      to: user.email,
      subject: "Verify your email - BuildyHome",
      html: htmlBody,
      text: `Your email verification code is: ${otp}. This code expires in 15 minutes.`,
    }).catch((err) => {
      logger.error("Verify OTP email failed", { error: err, userId });
    });
  });

  logger.info("Verification OTP generated and email queued", {
    userId,
    email: user.email,
  });

  return {
    success: true,
    message: "Verification OTP sent to your email",
  };
}

/**
 * Verify email using OTP
 */
export async function verifyEmail(userId: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isEmailVerified) {
    throw new Error("Email already verified");
  }

  // Verify OTP
  if (!user.verifyOtp || user.verifyOtp !== otp) {
    throw new Error("Invalid OTP");
  }

  if (!user.verifyOtpExpiresAt || new Date() > user.verifyOtpExpiresAt) {
    throw new Error("OTP expired");
  }

  // Mark as verified and clear OTP
  await prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      verifyOtp: null,
      verifyOtpExpiresAt: null,
    },
  });

  logger.info("Email verified successfully", {
    userId,
    email: user.email,
  });

  return {
    success: true,
    message: "Email verified successfully",
  };
}

/**
 * Enhanced adminCreateUser with email notification
 */
export async function adminCreateUserWithEmail(params: {
  email: string;
  name: string;
  role: UserRole;
  initialPassword: string;
  projectIds?: string[];
  createdById: string;
}) {
  // Use existing adminCreateUser function
  const user = await adminCreateUser(params);

  // Send welcome email with credentials asynchronously
  const htmlBody = newUserWelcomeTemplate({
    name: params.name,
    email: params.email,
    password: params.initialPassword,
    role: params.role,
  });

  setImmediate(() => {
    sendEmail({
      to: params.email,
      subject: "Your BuildyHome account credentials",
      html: htmlBody,
      text: `Hello ${params.name},

Your BuildyHome account has been created by an administrator.

Email: ${params.email}
Temporary Password: ${params.initialPassword}
Role: ${params.role}

Please login and change your password immediately for security.

Login at: ${process.env.FRONTEND_URL || "http://localhost:5173"}/login`,
    }).catch((err) => {
      logger.error("New user welcome email failed", {
        error: err,
        userId: user.id,
      });
    });
  });

  logger.info("User created by admin with email notification queued", {
    userId: user.id,
    email: params.email,
    role: params.role,
    createdBy: params.createdById,
  });

  return user;
}

/**
 * Enhanced registerUser with welcome email
 */
export async function registerUserWithEmail(params: {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}) {
  // Use existing registerUser function
  const result = await registerUser(params);

  // Send welcome email asynchronously
  const loginLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
  const htmlBody = welcomeEmailTemplate(params.name || "User", loginLink);

  setImmediate(() => {
    sendEmail({
      to: params.email,
      subject: `Welcome to BuildyHome, ${params.name || "User"}!`,
      html: htmlBody,
      text: `Welcome to BuildyHome! Log in at: ${loginLink}`,
    }).catch((err) => {
      logger.error("Welcome email failed", {
        error: err,
        userId: result.user.id,
      });
    });
  });

  logger.info("User registered with welcome email queued", {
    userId: result.user.id,
    email: params.email,
  });

  return result;
}
