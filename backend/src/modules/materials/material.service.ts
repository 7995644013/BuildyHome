import { prisma } from "../../config/database";
import { CreateMaterialInput, UpdateMaterialInput } from "./material.schema";

export function createMaterial(data: CreateMaterialInput) {
  return prisma.material.create({
    data: {
      name: data.name,
      unit: data.unit,
      unitPrice: data.unitPrice,
      quantityAvailable: data.quantityAvailable ?? 0,
      description: data.description,
      projectId: data.projectId,
    },
  });
}

export function listMaterials(projectId?: string) {
  return prisma.material.findMany({
    where: projectId ? { projectId } : {},
    orderBy: { createdAt: "desc" },
    include: {
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

export function getMaterial(materialId: string) {
  return prisma.material.findUnique({
    where: { id: materialId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          referenceNumber: true,
        },
      },
      expenses: {
        select: {
          id: true,
          amount: true,
          description: true,
          expenseDate: true,
        },
        orderBy: { expenseDate: "desc" },
        take: 10,
      },
    },
  });
}

export function updateMaterial(materialId: string, data: UpdateMaterialInput) {
  return prisma.material.update({
    where: { id: materialId },
    data: {
      name: data.name,
      unit: data.unit,
      unitPrice: data.unitPrice,
      quantityAvailable: data.quantityAvailable,
      description: data.description,
      projectId: data.projectId,
    },
  });
}

export function deleteMaterial(materialId: string) {
  return prisma.material.delete({
    where: { id: materialId },
  });
}

export async function updateMaterialQuantity(materialId: string, quantityChange: number) {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new Error("Material not found");
  
  const newQuantity = material.quantityAvailable + quantityChange;
  if (newQuantity < 0) throw new Error("Insufficient quantity");
  
  return prisma.material.update({
    where: { id: materialId },
    data: { quantityAvailable: newQuantity },
  });
}
