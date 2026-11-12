import { prisma } from "../../config/database";
import { ProjectStatus } from "@prisma/client";

function generateRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BH-${year}-${rand}`;
}

export function createProject(data: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: string;
  clientId?: string;
  projectManagerId: string;
  startDate?: string;
  endDate?: string;
}) {
  return prisma.project.create({
    data: {
      referenceNumber: generateRef(),
      name: data.name,
      description: data.description,
      status: data.status ?? ProjectStatus.PLANNING,
      priority: data.priority ?? "MEDIUM",
      clientId: data.clientId,
      projectManagerId: data.projectManagerId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
}

export function listProjects(params: { skip?: number; take?: number; includeDeleted?: boolean } = {}) {
  return prisma.project.findMany({
    skip: params.skip,
    take: params.take ?? 50,
    where: params.includeDeleted ? {} : { isDeleted: false },
    orderBy: { createdAt: "desc" },
  });
}

export function getProject(projectId: string, includeDeleted: boolean = false) {
  return prisma.project.findFirst({
    where: { 
      id: projectId,
      ...(includeDeleted ? {} : { isDeleted: false })
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
            },
          },
        },
      },
    },
  });
}

export function updateProject(projectId: string, data: Partial<{ name: string; description?: string; status?: ProjectStatus; priority?: string }>) {
  return prisma.project.update({
    where: { id: projectId },
    data,
  });
}

export function deleteProject(projectId: string) {
  return prisma.project.update({
    where: { id: projectId },
    data: { 
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

export function restoreProject(projectId: string) {
  return prisma.project.update({
    where: { id: projectId },
    data: { 
      isDeleted: false,
      deletedAt: null,
    },
  });
}

export function upsertLandInfo(projectId: string, data: {
  address: string;
  areaSqft?: number;
  ownershipType?: string;
  legalDescription?: string;
  coordinates?: unknown;
}) {
  return prisma.landInfo.upsert({
    where: { projectId },
    update: {
      address: data.address,
      areaSqft: data.areaSqft ? data.areaSqft : undefined,
      ownershipType: data.ownershipType,
      legalDescription: data.legalDescription,
      coordinates: data.coordinates as never,
    },
    create: {
      projectId,
      address: data.address,
      areaSqft: data.areaSqft ? data.areaSqft : undefined,
      ownershipType: data.ownershipType,
      legalDescription: data.legalDescription,
      coordinates: data.coordinates as never,
    },
  });
}

export function getLandInfo(projectId: string) {
  return prisma.landInfo.findUnique({ where: { projectId } });
}

