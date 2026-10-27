import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { decryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import { appState, instagramAccounts } from "@/lib/db/schema";
import { getMessagingProvider } from "@/lib/messaging/provider";
import type { MessagingProvider } from "@/lib/messaging/provider";

export type Account = typeof instagramAccounts.$inferSelect;

/**
 * Conta ativa do MVP (apenas uma). O schema já permite várias no futuro.
 * Filtra pelo transporte configurado para nunca misturar conta Meta com Zernio.
 */
export async function getActiveAccount(): Promise<Account | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(
        ne(instagramAccounts.connectionStatus, "disconnected"),
        eq(instagramAccounts.provider, getMessagingProvider()),
      ),
    )
    .orderBy(desc(instagramAccounts.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Endereço público do webhook da Zernio (usado ao registrar o endpoint). */
export function zernioWebhookUrl(): string | null {
  const base = process.env.APP_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/api/webhook/zernio` : null;
}

export function getAccountToken(account: Account): string {
  return decryptToken(account.accessTokenEncrypted);
}

export async function setAppStateValue(
  key: string,
  value: unknown,
): Promise<void> {
  const db = getDb();
  await db
    .insert(appState)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * Apaga a chave. `value` é `jsonb NOT NULL`, então gravar `null` estoura —
 * ausência de linha é a forma de dizer "sem valor".
 */
export async function clearAppStateValue(key: string): Promise<void> {
  await getDb().delete(appState).where(eq(appState.key, key));
}

export async function getAppStateValue<T = unknown>(
  key: string,
): Promise<T | null> {
  const db = getDb();
  const rows = await db
    .select({ value: appState.value })
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);
  return (rows[0]?.value as T | undefined) ?? null;
}

export async function markAccountReconnectRequired(
  accountId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(instagramAccounts)
    .set({ connectionStatus: "reconnect_required", updatedAt: new Date() })
    .where(eq(instagramAccounts.id, accountId));
}

export async function markAccountConnected(accountId: string): Promise<void> {
  const db = getDb();
  await db
    .update(instagramAccounts)
    .set({
      connectionStatus: "connected",
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(instagramAccounts.id, accountId));
}

export async function findAccountByInstagramUserId(
  instagramUserId: string,
  provider: MessagingProvider = "meta",
): Promise<Account | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(
        eq(instagramAccounts.instagramUserId, instagramUserId),
        eq(instagramAccounts.provider, provider),
        ne(instagramAccounts.connectionStatus, "disconnected"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Conta pelo `accountId` da Zernio, usado nos webhooks dela. */
export async function findAccountByProviderAccountId(
  providerAccountId: string,
): Promise<Account | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(
        eq(instagramAccounts.provider, "zernio"),
        eq(instagramAccounts.providerAccountId, providerAccountId),
        ne(instagramAccounts.connectionStatus, "disconnected"),
      ),
    )
    .orderBy(desc(instagramAccounts.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
