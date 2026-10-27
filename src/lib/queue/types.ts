import type {
  commentInteractions,
  instagramAccounts,
  outboundMessages,
} from "@/lib/db/schema";

export type JobRow = typeof outboundMessages.$inferSelect;
export type InteractionRow = typeof commentInteractions.$inferSelect;
export type AccountRow = typeof instagramAccounts.$inferSelect;

export type JobOutcome =
  "accepted" | "failed" | "uncertain" | "requeued" | "expired";

export type DrainSummary = {
  processed: number;
  accepted: number;
  failed: number;
  uncertain: number;
  expired: number;
  requeued: number;
};

export const EMPTY_SUMMARY: DrainSummary = {
  processed: 0,
  accepted: 0,
  failed: 0,
  uncertain: 0,
  expired: 0,
  requeued: 0,
};
