import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "dataset.json");

const MessageSchema = z.object({
  role: z.enum(["customer", "agent"]),
  text: z.string(),
  timestamp: z.string(),
});

export const SupportTicketSchema = z.object({
  id: z.string(),
  issue_type: z.string(),
  channel: z.enum(["email", "chat", "phone", "social_media"]),
  customer_id: z.string(),
  agent_id: z.string(),
  messages: z.array(MessageSchema).min(1),
  message_count: z.number().int().min(1),
  resolution: z.enum(["Resolved", "Pending", "Escalated", "Waiting on Customer", "Closed"]),
  satisfaction_score: z.number().int().min(1).max(5).nullable().optional(),
  first_response_minutes: z.number().int().min(0),
  resolution_hours: z.number().min(0).nullable().optional(),
  created_at: z.string(),
});

export const DatasetSchema = z.array(SupportTicketSchema);
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export function loadAndValidate(): { valid: SupportTicket[]; errors: z.ZodError[] } {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const valid: SupportTicket[] = [];
  const errors: z.ZodError[] = [];
  for (const item of raw) {
    const result = SupportTicketSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push(result.error);
    }
  }
  return { valid, errors };
}

export function validateRecord(record: unknown): record is SupportTicket {
  return SupportTicketSchema.safeParse(record).success;
}
