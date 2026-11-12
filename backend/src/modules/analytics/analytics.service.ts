import { prisma } from "../../config/database";
import { UserRole } from "@prisma/client";

export async function getDashboardStats(userId: string, userRole: UserRole) {
  // Get user's accessible project IDs
  let accessibleProjectIds: string[] = [];

  if (userRole === UserRole.super_admin || userRole === UserRole.admin) {
    // Admins see all projects - use Prisma count
    const totalProjects = await prisma.project.count();
    
    // Count tasks using Prisma
    const totalTasks = await prisma.task.count();
    
    // Count completed tasks
    const completedTasks = await prisma.task.count({
      where: {
        userApproved: true,
        adminApproved: true,
      },
    });
    
    // Count overdue tasks
    const now = new Date();
    const overdueTasks = await prisma.task.count({
      where: {
        dueDate: { lt: now },
        status: { not: "DONE" },
        OR: [
          { userApproved: false },
          { adminApproved: false },
        ],
      },
    });

    return {
      totalProjects,
      completedTasks,
      myTasks: totalTasks,
      overdueIssues: overdueTasks,
    };
  } else {
    // Use the same logic as getUserProjects to ensure consistency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return {
        totalProjects: 0,
        completedTasks: 0,
        myTasks: 0,
        overdueIssues: 0,
      };
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

    // Combine and deduplicate (same logic as getUserProjects)
    const projectIds = new Set<string>();
    assignments.forEach((a) => projectIds.add(a.projectId));
    managedProjects.forEach((p) => projectIds.add(p.id));
    clientProjects.forEach((p) => projectIds.add(p.id));
    accessibleProjectIds = Array.from(projectIds);

    // Use COUNT queries for better performance
    const totalProjects = accessibleProjectIds.length;
    
    if (accessibleProjectIds.length === 0) {
      return {
        totalProjects: 0,
        completedTasks: 0,
        myTasks: 0,
        overdueIssues: 0,
      };
    }

    // Use Prisma queries instead of raw SQL for better compatibility
    const totalTasks = await prisma.task.count({
      where: {
        projectId: { in: accessibleProjectIds },
      },
    });
    
    const completedTasks = await prisma.task.count({
      where: {
        projectId: { in: accessibleProjectIds },
        userApproved: true,
        adminApproved: true,
      },
    });
    
    const myTasks = await prisma.task.count({
      where: {
        projectId: { in: accessibleProjectIds },
        assigneeId: userId,
      },
    });
    
    const now = new Date();
    const overdueTasks = await prisma.task.count({
      where: {
        projectId: { in: accessibleProjectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
        OR: [
          { userApproved: false },
          { adminApproved: false },
        ],
      },
    });

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      myTasks,
      overdueIssues: overdueTasks,
    };
  }
}

