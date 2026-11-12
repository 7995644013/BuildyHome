import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";

export async function addTicketComment(ticketId: string, userId: string, content: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, "Ticket not found");

  return prisma.ticketComment.create({
    data: {
      ticketId,
      userId,
      content,
    },
    include: {
      user: {
        select: { id: true, name: true, role: true, email: true }, // Include user details
      },
    },
  });
}

export async function getTicketComments(ticketId: string) {
  return prisma.ticketComment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, role: true, email: true },
      },
    },
  });
}
