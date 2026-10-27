/** Tipos dos eventos recebidos da Meta (e traduzidos da Zernio). */
import type { commentInteractions } from "@/lib/db/schema";

export type CommentValue = {
  id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

export type InboundMessage = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
    reply_to?: { mid?: string };
  };
  postback?: {
    mid?: string;
    title?: string;
    payload?: string;
  };
};

export type WebhookEntry = {
  id?: string;
  time?: number;
  changes?: Array<{ field?: string; value?: unknown }>;
  messaging?: InboundMessage[];
};

export type WebhookPayload = {
  object?: string;
  entry?: WebhookEntry[];
};

export type WebhookSummary = {
  received: number;
  processed: number;
  ignored: number;
  failed: number;
};

export type Outcome = "processed" | "ignored" | "failed";

export type InteractionRow = typeof commentInteractions.$inferSelect;
