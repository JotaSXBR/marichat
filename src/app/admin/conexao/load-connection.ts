import "server-only";

import { desc } from "drizzle-orm";

import {
  metaEnv,
  zernioEnv,
  type EnvRequirement,
} from "@/app/admin/conexao/connection-utils";
import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { webhookEvents } from "@/lib/db/schema";
import {
  CONNECTION_TEST_KEY,
  type ConnectionTestResult,
} from "@/lib/instagram/diagnostics";
import { listInstagramAccounts, type ZernioAccount } from "@/lib/zernio/client";
import { isZernioConfigured } from "@/lib/zernio/config";

export type ConnectionPageData = {
  account: Awaited<ReturnType<typeof getActiveAccount>>;
  webhookError: string | null;
  subscribedAt: string | null;
  connectionTest: ConnectionTestResult | null;
  appUrl?: string;
  zernioAccounts: ZernioAccount[];
  zernioListError: string | null;
  lastEvents: { eventKey: string; status: string; receivedAt: Date }[];
  requiredEnv: readonly EnvRequirement[];
};

/** Lê a lista de contas da Zernio, guardando o erro para exibir na tela. */
async function loadZernioAccounts(): Promise<{
  accounts: ZernioAccount[];
  error: string | null;
}> {
  if (!isZernioConfigured()) return { accounts: [], error: null };

  try {
    return { accounts: await listInstagramAccounts(), error: null };
  } catch (error) {
    return {
      accounts: [],
      error: error instanceof Error ? error.message : "Erro desconhecido.",
    };
  }
}

/** Junta tudo o que a tela de Conexão precisa, sem renderizar nada. */
export async function loadConnectionData(
  isZernio: boolean,
): Promise<ConnectionPageData> {
  const account = await getActiveAccount();
  const webhookError = await getAppStateValue<string>(
    "webhook_subscription_error",
  );
  const subscribedAt = await getAppStateValue<string>("webhook_subscribed_at");
  const connectionTest =
    await getAppStateValue<ConnectionTestResult>(CONNECTION_TEST_KEY);

  const zernio = isZernio
    ? await loadZernioAccounts()
    : { accounts: [], error: null };

  const db = getDb();
  const lastEvents = await db
    .select({
      eventKey: webhookEvents.eventKey,
      status: webhookEvents.status,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(5);

  return {
    account,
    webhookError,
    subscribedAt,
    connectionTest,
    appUrl: process.env.APP_URL?.replace(/\/+$/, ""),
    zernioAccounts: zernio.accounts,
    zernioListError: zernio.error,
    lastEvents,
    requiredEnv: isZernio ? zernioEnv : metaEnv,
  };
}
