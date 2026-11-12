import { prisma } from "../../config/database";
import { ProjectStatus, TaskStatus, UserRole } from "@prisma/client";

export function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  });
}

export function updateProfile(userId: string, data: { name?: string; phone?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listUsers(role?: string) {
  // Fetch users with their related projects so we can calculate accurate
  // allocated project counts per user. We deliberately keep the raw relations
  // internal and return a flattened DTO to the API layer.

  // Support comma-separated roles (e.g., "site_engineer,project_manager")
  let whereClause: { role?: UserRole | { in: UserRole[] } } | undefined = undefined;
  if (role) {
    const roles = role.split(",").map((r) => r.trim() as UserRole);
    if (roles.length === 1) {
      whereClause = { role: roles[0] };
    } else {
      whereClause = { role: { in: roles } };
    }
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      projectAssignments: {
        include: {
          project: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      // Projects where the user is the project manager
      projects: {
        select: {
          id: true,
          status: true,
        },
      },
      // Projects where the user is the client / owner
      clientProjects: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute task completion stats per assignee using groupBy for efficiency
  const userIds = users.map((u) => u.id);
  const taskGroups =
    userIds.length === 0
      ? []
      : await prisma.task.groupBy({
          by: ["assigneeId", "status"],
          where: {
            assigneeId: { in: userIds },
          },
          _count: {
            _all: true,
          },
        });

  const taskStatsByUser = new Map<
    string,
    {
      total: number;
      done: number;
    }
  >();

  for (const group of taskGroups) {
    if (!group.assigneeId) continue;
    const current = taskStatsByUser.get(group.assigneeId) || {
      total: 0,
      done: 0,
    };
    current.total += group._count._all;
    if (group.status === TaskStatus.DONE) {
      current.done += group._count._all;
    }
    taskStatsByUser.set(group.assigneeId, current);
  }

  return users.map((user) => {
    const projectIds = new Set<string>();

    // Count distinct active projects from assignments (filtering out cancelled ones
    // as a proxy for "soft-deleted" assignments/projects)
    user.projectAssignments.forEach((assignment) => {
      if (assignment.project && assignment.project.status !== ProjectStatus.CANCELLED) {
        projectIds.add(assignment.project.id);
      }
    });

    // Include projects where the user is the project manager
    user.projects.forEach((project) => {
      if (project.status !== ProjectStatus.CANCELLED) {
        projectIds.add(project.id);
      }
    });

    // Include projects where the user is the client
    user.clientProjects.forEach((project) => {
      if (project.status !== ProjectStatus.CANCELLED) {
        projectIds.add(project.id);
      }
    });

    const taskStats = taskStatsByUser.get(user.id) || { total: 0, done: 0 };
    const completionRate =
      taskStats.total > 0
        ? Math.round((taskStats.done / taskStats.total) * 100)
        : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      designation: user.designation,
      createdAt: user.createdAt,
      isActive: user.isActive,
      projectCount: projectIds.size,
      taskCompletionRate: completionRate,
    };
  });
}

export function updateUserRole(userId: string, role: UserRole) {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      designation: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function updateUser(userId: string, data: { name?: string; phone?: string; designation?: string; isActive?: boolean; role?: UserRole }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      designation: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      designation: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getUserProjects(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return [];
  }

  // Super admin and admin can see ALL projects (excluding deleted by default)
  if (user.role === UserRole.super_admin || user.role === UserRole.admin) {
    const allProjects = await prisma.project.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        description: true,
        referenceNumber: true,
        status: true,
        priority: true,
        progress: true,
        isDeleted: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return allProjects;
  }

  // For other roles, return only assigned/managed/client projects
  const userWithProjects = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projectAssignments: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              referenceNumber: true,
              status: true,
              priority: true,
              progress: true,
              isDeleted: true,
              deletedAt: true,
            },
          },
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          description: true,
          referenceNumber: true,
          status: true,
          priority: true,
          progress: true,
          isDeleted: true,
          deletedAt: true,
        },
      },
      clientProjects: {
        select: {
          id: true,
          name: true,
          description: true,
          referenceNumber: true,
          status: true,
          priority: true,
          progress: true,
          isDeleted: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!userWithProjects) {
    return [];
  }

  // Combine and deduplicate projects
  const assignedProjects = userWithProjects.projectAssignments
    .map((pa: { project: { isDeleted: boolean } }) => pa.project)
    .filter((project) => !project.isDeleted);
  const managedProjects = userWithProjects.projects.filter(
    (project) => !project.isDeleted
  );
  const clientProjects = userWithProjects.clientProjects.filter(
    (project) => !project.isDeleted
  );

  const allProjects = [
    ...assignedProjects,
    ...managedProjects,
    ...clientProjects,
  ].reduce((acc: any[], project: any) => {
    if (!acc.find((p: any) => p.id === project.id)) {
      acc.push(project);
    }
    return acc;
  }, [] as any[]);

  return allProjects;
}

export async function assignUserToProject(
  userId: string,
  projectId: string,
  role: string | undefined,
  assignedBy: string
) {
  return prisma.projectAssignment.upsert({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    update: {
      role: role || undefined,
    },
    create: {
      userId,
      projectId,
      role: role || undefined,
      assignedBy,
    },
  });
}

export async function assignUserToProjects(
  userId: string,
  projectIds: string[],
  role: string | undefined,
  assignedBy: string
) {
  return prisma.projectAssignment.createMany({
    data: projectIds.map((projectId: string) => ({
      userId,
      projectId,
      role: role || undefined,
      assignedBy,
    })),
    skipDuplicates: true,
  });
}

export async function removeUserFromProject(userId: string, projectId: string) {
  return prisma.projectAssignment.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });
}

// Soft delete user (deactivate)
export function softDeleteUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });
}

// Restore user (reactivate)
export function restoreUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });
}

// Update project assignment role
export function updateProjectAssignment(userId: string, projectId: string, role: string) {
  return prisma.projectAssignment.update({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    data: { role },
  });
}
