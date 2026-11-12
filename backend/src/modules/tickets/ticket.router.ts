import { Router } from "express";
import { authGuard, AuthenticatedRequest } from "../../shared/guards/authGuard";
import { roleGuard } from "../../shared/guards/roleGuard";
import { UserRole } from "@prisma/client";
import { createTicketSchema, updateTicketStatusSchema } from "./ticket.schema";
import { createTicket, getTickets, requestTicketClose, updateTicketStatus } from "./ticket.service";
import { addTicketComment, getTicketComments } from "./ticket.comment.service";

const router = Router();

router.use(authGuard);

// Create Ticket (Client Only)
router.post("/", roleGuard([UserRole.client]), async (req, res, next) => {
  try {
    const data = createTicketSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    // @ts-ignore - createTicket signature updated
    const ticket = await createTicket(data, userId);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// Request Close (PM)
router.patch("/:id/close-request", roleGuard([UserRole.project_manager, UserRole.admin]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user!.id;
    const result = await requestTicketClose(id, userId, req.body.comments);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Add Comment
router.post("/:id/comments", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as AuthenticatedRequest).user!.id;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const comment = await addTicketComment(id, userId, content);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// Get Comments
router.get("/:id/comments", async (req, res, next) => {
  try {
    const { id } = req.params;
    const comments = await getTicketComments(id);
    res.status(200).json(comments);
  } catch (err) {
    next(err);
  }
});

// Force Update Status (Super Admin)
router.patch("/:id", roleGuard([UserRole.super_admin]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateTicketStatusSchema.parse(req.body);
    const result = await updateTicketStatus(id, data.status);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Get Tickets
router.get("/", async (req, res, next) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
       return res.status(400).json({ error: "ProjectId is required" });
    }
    const tickets = await getTickets(projectId);
    res.status(200).json(tickets);
  } catch (err) {
    next(err);
  }
});

export { router as ticketRouter };
