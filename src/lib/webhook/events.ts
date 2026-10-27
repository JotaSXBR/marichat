import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { webhookEvents } from "@/lib/db/schema";

/** Token opaco usado nos botões da porta de seguidor. */
export function opaqueToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

/**
 * Reserva o evento pelo `eventKey`. Devolve `false` quando já foi processado
 * (dedupe), sem lançar erro. Um evento que falhou pode ser reservado de novo
 * quando o provedor reenvia.
 */
export async function claimEvent(params: {
  eventKey: string;
  field: string;
  instagramUserId: string | null;
  payload: unknown;
}): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(webhookEvents)
    .values({
      eventKey: params.eventKey,
      field: params.field,
      instagramUserId: params.instagramUserId,
      payload: params.payload,
      status: "received",
    })
    .onConflictDoUpdate({
      target: webhookEvents.eventKey,
      set: { status: "received", errorMessage: null, processedAt: null },
      setWhere: eq(webhookEvents.status, "failed"),
    })
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

export async function finishEvent(
  eventKey: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(webhookEvents)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      processedAt: new Date(),
    })
    .where(eq(webhookEvents.eventKey, eventKey));
}
