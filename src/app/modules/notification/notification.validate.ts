import z from "zod";
import { NotificationType } from "./notification.interface";

export const NotifyInputSchema = z.object({
  user: z.string().min(10),
  title: z.string().min(1).max(120),
  body: z.string().max(300).optional().default(''),

  // navigation payload
  type: z.nativeEnum(NotificationType), // "CHAT", "REVIEW", etc.
  entityId: z.string().optional().default(''),
  webUrl: z.string().url().optional().default(''),
  deepLink: z.string().optional().default(''),

  data: z.record(z.string(), z.string()).optional().default({}),
});