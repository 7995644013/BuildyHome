import { prisma } from "../../config/database";
import { TicketStatus, ApprovalType } from "@prisma/client";
import { createApprovalRequest } from "../approvals/approval.service";
import { AppError } from "../../utils/AppError";

export async function createTicket(
  data: {
    projectId: string;
    title: string;
    description: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assignedToId?: string;
  },
  createdById: string
) {
  console.log("Creating ticket with data:", JSON.stringify(data));
  
  // Get project manager
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { projectManagerId: true }
  });

  console.log("Found project:", project);

  if (!project) throw new AppError(404, "Project not found");

  try {
    const ticket = await prisma.ticket.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        assignedToId: project.projectManagerId, // Auto-assign to PM
        createdById,
        status: TicketStatus.OPEN,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
      }
    });
    console.log("Ticket created:", ticket.id);
    return ticket;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus
) {
  return prisma.ticket.update({
    where: { id },
    data: { status },
  });
}

export async function requestTicketClose(
  ticketId: string,
  requestedById: string,
  comments?: string
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, "Ticket not found");

  if (ticket.status === TicketStatus.CLOSED) {
    throw new AppError(400, "Ticket is already closed");
  }

  // Update ticket status to indicate pending close
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.PENDING_CLOSE_APPROVAL },
  });

  // Create approval request
  return createApprovalRequest(
    ApprovalType.TICKET_CLOSE,
    ticketId,
    requestedById,
    comments || "Requesting to close ticket"
  );
}

export async function getTickets(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { 
      createdBy: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true, role: true } }
    },
  });
}
