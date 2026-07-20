import { z } from "zod";

export const createSupportTicketSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(255),
  message: z.string().trim().min(10).max(5000),
  honeypot: z.string().max(0).optional(),
});

export const adminSupportTicketUpdateSchema = z.object({
  status: z.enum(["new", "open", "waiting", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  adminNotes: z.string().trim().max(5000).nullable().optional(),
});

export const adminUserRoleSchema = z.object({
  role: z.enum(["admin", "support", "user"]),
});

export const supportHoursSchema = z.object({
  supportHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  supportHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  supportTimezone: z.string().trim().min(3).max(64),
  supportResponseText: z.string().trim().min(3).max(500),
});
