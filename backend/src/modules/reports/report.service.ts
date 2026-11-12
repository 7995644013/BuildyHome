import { prisma } from "../../config/database";

export function createReport(data: {
  projectId: string;
  createdById: string;
  reportDate: Date;
  workDone: string;
  issues?: string;
  nextSteps?: string;
}) {
  return prisma.dailyReport.create({
    data: {
      projectId: data.projectId,
      createdById: data.createdById,
      reportDate: data.reportDate,
      workDone: data.workDone,
      issues: data.issues,
      nextSteps: data.nextSteps,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
}

export function listProjectReports(projectId: string) {
  return prisma.dailyReport.findMany({
    where: { projectId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { reportDate: "desc" },
  });
}

export function getReport(reportId: string) {
  return prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
}

export function updateReport(reportId: string, data: {
  reportDate?: Date;
  workDone?: string;
  issues?: string;
  nextSteps?: string;
}) {
  return prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      reportDate: data.reportDate,
      workDone: data.workDone,
      issues: data.issues,
      nextSteps: data.nextSteps,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
}

export function deleteReport(reportId: string) {
  return prisma.dailyReport.delete({
    where: { id: reportId },
  });
}

