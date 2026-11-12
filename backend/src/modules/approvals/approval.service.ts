import { prisma } from "../../config/database";
import { ApprovalStatus, ApprovalType } from "@prisma/client";
import { AppError } from "../../utils/AppError";

export async function getPendingApprovalForTarget(targetId: string, _type: string) {
  return prisma.approval.findFirst({
    where: {
      targetId,
     // type: type as ApprovalType, // Optional: if targetId is unique enough, but safe to add type
      status: ApprovalStatus.PENDING
    },
    include: {
        requestedBy: { select: { id: true, name: true, email: true } }
    }
  });
}

export async function createApprovalRequest(
  type: ApprovalType,
  targetId: string,
  requestedById: string,
  comments?: string
) {
  // Optional: Verify targetId exists based on type
  // e.g. if type === BUDGET, check if Budget exists. 
  // For now, we assume caller validates this or we catch FK errors (though targetId isn't FK in schema to keep it polymorphic-ish or loose)

  const approval = await prisma.approval.create({
    data: {
      type,
      targetId,
      requestedById,
      comments,
      status: ApprovalStatus.PENDING,
    },
  });
  return approval;
}

export async function respondToApproval(
  approvalId: string,
  approvedById: string,
  status: ApprovalStatus, // APPROVED, REJECTED, CHANGES_REQUESTED
  comments?: string
) {
  if (status === ApprovalStatus.PENDING) {
    throw new AppError(400, "Cannot respond with PENDING status");
  }

  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    throw new AppError(404, "Approval request not found");
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new AppError(400, "Approval request is already processed");
  }

  const updatedApproval = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status,
      approvedById,
      comments: comments ? `${approval.comments || ''}\n[Response]: ${comments}` : approval.comments,
    },
  });

  // Handle post-approval logic
  if (status === ApprovalStatus.APPROVED) {
    if (updatedApproval.type === ApprovalType.BUDGET_APPROVAL) {
      await prisma.budget.update({
        where: { projectId: updatedApproval.targetId }, // Assuming targetId is projectId for Budget
        data: { status: "APPROVED" },
      });
    } else if (updatedApproval.type === ApprovalType.TICKET_CLOSE) {
       await prisma.ticket.update({
        where: { id: updatedApproval.targetId },
        data: { status: "CLOSED" },
      });
    } else if (updatedApproval.type === ApprovalType.PROJECT_DELETE) {
        // Project deletion logic (Soft delete)
       await prisma.project.update({
        where: { id: updatedApproval.targetId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else if (updatedApproval.type === ApprovalType.EXPENSE_APPROVAL) {
       await prisma.expense.update({
        where: { id: updatedApproval.targetId },
        data: { status: "APPROVED" }
       });
    }
  } else if (status === ApprovalStatus.REJECTED || status === ApprovalStatus.CHANGES_REQUESTED) {
     if (updatedApproval.type === ApprovalType.BUDGET_APPROVAL) {
      await prisma.budget.update({
        where: { projectId: updatedApproval.targetId },
        data: { status: "REJECTED" },
      });
    } else if (updatedApproval.type === ApprovalType.TICKET_CLOSE) {
       await prisma.ticket.update({
        where: { id: updatedApproval.targetId },
        data: { status: "OPEN" },
      });
    } else if (updatedApproval.type === ApprovalType.EXPENSE_APPROVAL) {
       await prisma.expense.update({
        where: { id: updatedApproval.targetId },
        data: { status: "REJECTED" }
       });
    }
  }

  return updatedApproval;
}

export async function getApprovals(role: string, userId: string) {
  if (role === "super_admin") {
    return prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { name: true, email: true } } },
    });
  } else {
    return prisma.approval.findMany({
      where: { requestedById: userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
export function getApprovalHistory(targetId: string) {
  return prisma.approval.findMany({
    where: { targetId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } }
    }
  });
}
