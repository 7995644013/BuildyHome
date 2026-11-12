import { prisma } from "../../config/database";

export async function getClientProjectSummary(
  projectId: string,
  userId: string
) {
  // Verify user has access to this project (as client or through assignment)
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { clientId: userId },
        {
          assignments: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
          userApproved: true,
          adminApproved: true,
          dueDate: true,
        },
      },
      budget: {
        select: {
          totalAmount: true,
          remainingAmount: true,
          currency: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  // Calculate progress based on completed tasks
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(
    (t) => t.userApproved && t.adminApproved
  ).length;
  const activeTasks = project.tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "TODO"
  ).length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get financial data
  const expenses = await prisma.expense.findMany({
    where: { projectId },
    select: {
      amount: true,
    },
  });

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = project.budget ? Number(project.budget.totalAmount) : 0;
  const remaining = totalBudget - totalSpent;
  const spentPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Get recent photos from tasks
  const recentPhotos = await prisma.taskPhoto.findMany({
    where: {
      task: {
        projectId,
      },
    },
    orderBy: {
      uploadedAt: "desc",
    },
    take: 12,
    select: {
      id: true,
      photoUrl: true,
      caption: true,
      uploadedAt: true,
    },
  });

  // Get milestones (tasks with due dates, sorted by due date)
  const milestones = await prisma.task.findMany({
    where: {
      projectId,
      dueDate: {
        not: null,
      },
    },
    orderBy: {
      dueDate: "asc",
    },
    take: 5,
    select: {
      id: true,
      title: true,
      dueDate: true,
      userApproved: true,
      adminApproved: true,
    },
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      referenceNumber: project.referenceNumber,
      progress: project.progress,
    },
    progress: {
      totalTasks,
      completedTasks,
      activeTasks,
      completionPercentage,
    },
    financial: {
      totalBudget,
      totalSpent,
      remaining,
      spentPercentage,
      currency: project.budget?.currency || "USD",
    },
    recentPhotos: recentPhotos.map((p) => ({
      id: p.id,
      url: p.photoUrl,
      caption: p.caption,
      uploadedAt: p.uploadedAt,
    })),
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate,
      completed: m.userApproved && m.adminApproved,
    })),
  };
}
