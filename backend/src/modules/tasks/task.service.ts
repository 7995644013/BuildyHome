import { prisma } from "../../config/database";
import { TaskStatus } from "@prisma/client";

export function createTask(data: {
  projectId: string;
  assigneeId?: string;
  createdById?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: Date;
}) {
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      createdById: data.createdById,
      title: data.title,
      description: data.description,
      status: data.status ?? TaskStatus.TODO,
      dueDate: data.dueDate,
    },
  });
}

export function listProjectTasks(projectId: string, includeDeleted: boolean = false) {
  return prisma.task.findMany({
    where: { 
      projectId,
      ...(includeDeleted ? {} : { isDeleted: false })
    },
    orderBy: { createdAt: "desc" },
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
    },
  });
}

export function getTask(taskId: string, includeDeleted: boolean = false) {
  return prisma.task.findFirst({
    where: { 
      id: taskId,
      ...(includeDeleted ? {} : { isDeleted: false })
    },
    include: {
      assignee: {
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
          clientId: true,
          projectManagerId: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          projectManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export function updateTask(taskId: string, data: Partial<{ title: string; description?: string; status?: TaskStatus; assigneeId?: string; dueDate?: Date }>) {
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}

export function approveTask(taskId: string, flags: { userApproved?: boolean; adminApproved?: boolean; clientApproved?: boolean }) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      userApproved: flags.userApproved ?? undefined,
      adminApproved: flags.adminApproved ?? undefined,
      clientApproved: flags.clientApproved ?? undefined,
      status:
        flags.userApproved && flags.adminApproved
          ? TaskStatus.DONE
          : flags.userApproved || flags.adminApproved
          ? TaskStatus.PENDING_APPROVAL
          : undefined,
    },
  });
}

export function deleteTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

export function restoreTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
}

export function addTaskPhoto(taskId: string, data: { photoUrl: string; caption?: string }) {
  return prisma.taskPhoto.create({
    data: {
      taskId,
      photoUrl: data.photoUrl,
      caption: data.caption,
    },
  });
}

export function getTaskPhotos(taskId: string) {
  return prisma.taskPhoto.findMany({
    where: { taskId },
    orderBy: { uploadedAt: "desc" },
  });
}

export function deleteTaskPhoto(photoId: string) {
  return prisma.taskPhoto.delete({
    where: { id: photoId },
  });
}

export function addTaskComment(taskId: string, userId: string, content: string) {
  return prisma.taskComment.create({
    data: {
      taskId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export function getTaskComments(taskId: string) {
  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function resolveArbitration(taskId: string, resolution: "approve" | "reject", _resolvedById: string) {
  if (resolution === "approve") {
    return prisma.task.update({
      where: { id: taskId },
      data: {
        userApproved: true,
        adminApproved: true,
        status: TaskStatus.DONE,
        inArbitration: false,
        disputeStartedAt: null,
        completedAt: new Date(),
      },
    });
  } else {
    return prisma.task.update({
      where: { id: taskId },
      data: {
        userApproved: false,
        adminApproved: false,
        status: TaskStatus.IN_PROGRESS,
        inArbitration: false,
        disputeStartedAt: null,
      },
    });
  }
}

export async function escalateToArbitration() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await prisma.task.updateMany({
    where: {
      status: TaskStatus.PENDING_APPROVAL,
      disputeStartedAt: {
        lte: sevenDaysAgo,
      },
      inArbitration: false,
    },
    data: {
      status: TaskStatus.ARBITRATION,
      inArbitration: true,
    },
  });

  return result;
}

// TaskComment update
export function updateTaskComment(commentId: string, content: string) {
  return prisma.taskComment.update({
    where: { id: commentId },
    data: { content },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

// TaskComment delete
export function deleteTaskComment(commentId: string) {
  return prisma.taskComment.delete({
    where: { id: commentId },
  });
}

// TaskComment get (for ownership check)
export function getTaskComment(commentId: string) {
  return prisma.taskComment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        select: { projectId: true },
      },
    },
  });
}

// TaskPhoto update caption
export function updateTaskPhoto(photoId: string, caption: string) {
  return prisma.taskPhoto.update({
    where: { id: photoId },
    data: { caption },
  });
}

// TaskPhoto get (for ownership check)
export function getTaskPhoto(photoId: string) {
  return prisma.taskPhoto.findUnique({
    where: { id: photoId },
    include: {
      task: {
        select: { projectId: true },
      },
    },
  });
}

// Arbitration get by task ID
export function getArbitration(taskId: string) {
  return prisma.arbitration.findUnique({
    where: { taskId },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

// List all arbitrations (for admin/super_admin)
export function listArbitrations(projectId?: string) {
  return prisma.arbitration.findMany({
    where: projectId ? { task: { projectId } } : {},
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
          project: {
            select: {
              name: true,
              referenceNumber: true,
            },
          },
        },
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
