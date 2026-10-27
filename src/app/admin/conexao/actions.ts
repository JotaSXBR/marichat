"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearAppStateValue,
  getAccountToken,
  getActiveAccount,
  setAppStateValue,
  zernioWebhookUrl,
  type Account,
} from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import { instagramAccounts } from "@/lib/db/schema";
import { readText } from "@/lib/form-data";
import { getSubscribedApps, subscribeWebhooks } from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";
import {
  CONNECTION_TEST_KEY,
  runConnectionTest,
} from "@/lib/instagram/diagnostics";
import {
  createWebhookSettings,
  listInstagramAccounts,
  listWebhookSettings,
  type ZernioAccount,
} from "@/lib/zernio/client";
import { ZERNIO, isZernioConfigured } from "@/lib/zernio/config";
import { runZernioConnectionTest } from "@/lib/zernio/diagnostics";
import { chooseZernioAccount } from "@/lib/zernio/select-account";

/** Ações da tela de Conexão (Meta direto e Zernio). */

const ADMIN_PATH = "/admin";
const CONNECTION_PATH = "/admin/conexao";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "erro desconhecido";
}

export async function disconnectInstagram(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();
  if (!account) return;

  const db = getDb();
  await db
    .update(instagramAccounts)
    .set({
      connectionStatus: "disconnected",
      updatedAt: new Date(),
    })
    .where(eq(instagramAccounts.id, account.id));

  revalidatePath(CONNECTION_PATH);
  revalidatePath(ADMIN_PATH);
  redirect("/admin/conexao?desconectado=1");
}

export async function resubscribeWebhooks(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();
  if (!account || account.connectionStatus !== "connected") {
    redirect("/admin/conexao?erro=conexao");
  }

  if (account.provider === "zernio") {
    await registerZernioWebhookFor();
    revalidatePath(CONNECTION_PATH);
    redirect("/admin/conexao?webhook=1");
  }

  await subscribeMetaWebhooks(account);

  revalidatePath(CONNECTION_PATH);
  redirect(CONNECTION_PATH);
}

/** Assina os campos do webhook na Meta e confere se todos apareceram. */
async function subscribeMetaWebhooks(account: Account): Promise<void> {
  try {
    const accessToken = getAccountToken(account);
    await subscribeWebhooks({
      igUserId: account.instagramUserId,
      accessToken,
    });

    // A Meta responde apenas {"success": true}. Lemos de volta para confirmar
    // que os campos aparecem na inscrição da conta.
    const apps = await getSubscribedApps({
      igUserId: account.instagramUserId,
      accessToken,
    });
    const fields = new Set(apps.flatMap((app) => app.subscribedFields));
    const missing = IG.webhookFields.filter((field) => !fields.has(field));

    if (missing.length > 0) {
      await setAppStateValue(
        "webhook_subscription_error",
        `A Meta aceitou a inscrição, mas estes campos não aparecem: ${missing.join(", ")}. Confira as assinaturas do app no painel da Meta.`,
      );
    } else {
      await clearAppStateValue("webhook_subscription_error");
      await setAppStateValue("webhook_subscribed_at", new Date().toISOString());
    }
  } catch (error) {
    await setAppStateValue("webhook_subscription_error", errorMessage(error));
  }
}

/**
 * Confere token e campos de webhook assinados, guardando o resultado para a
 * página de Conexão. Não envia mensagens nem altera automações.
 */
export async function testInstagramConnection(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();
  if (!account) {
    redirect("/admin/conexao?erro=conexao");
  }

  const result = await runConnectionTest(account);
  await setAppStateValue(CONNECTION_TEST_KEY, result);

  revalidatePath(CONNECTION_PATH);
  revalidatePath(ADMIN_PATH);
  redirect("/admin/conexao?testado=1");
}

/**
 * Vincula uma conta do Instagram que já está conectada dentro da Zernio.
 *
 * A Zernio cuida do OAuth e do token; guardamos apenas o `accountId` dela e
 * um marcador cifrado no lugar do token (o campo é obrigatório no schema e a
 * leitura do token é ignorada quando `provider = zernio`).
 */
export async function connectZernio(formData: FormData): Promise<void> {
  await requireAdmin();

  if (!isZernioConfigured()) {
    redirect("/admin/conexao?erro=zernio-chave");
  }

  let accounts;
  try {
    accounts = await listInstagramAccounts();
  } catch (error) {
    await setAppStateValue("zernio_connection_error", errorMessage(error));
    redirect("/admin/conexao?erro=zernio-api");
  }

  if (accounts.length === 0) {
    redirect("/admin/conexao?erro=zernio-conta");
  }

  const chosen = chooseZernioAccount(
    accounts,
    readText(formData, "accountId").trim(),
  );
  if (!chosen) {
    redirect("/admin/conexao?erro=zernio-escolha");
  }

  try {
    await saveZernioAccount(chosen);
  } catch (error) {
    await setAppStateValue("zernio_connection_error", errorMessage(error));
    redirect("/admin/conexao?erro=zernio-salvar");
  }

  await clearAppStateValue("zernio_connection_error");
  await clearAppStateValue("webhook_subscription_error");
  await setAppStateValue("webhook_subscribed_at", new Date().toISOString());

  revalidatePath(CONNECTION_PATH);
  revalidatePath(ADMIN_PATH);
  redirect(
    `/admin/conexao?ok=1&conta=${encodeURIComponent(chosen.username ?? "")}`,
  );
}

/** Insere ou atualiza a conta e deixa só ela ativa no provedor Zernio. */
async function saveZernioAccount(chosen: ZernioAccount): Promise<void> {
  const instagramUserId =
    chosen.platformUserId ?? chosen.instagramScopedId ?? chosen.id;
  const now = new Date();
  const db = getDb();

  const existingId = await findExistingAccountId(chosen.id, instagramUserId);
  const values = {
    provider: "zernio" as const,
    providerAccountId: chosen.id,
    instagramUserId,
    username: chosen.username ?? "instagram",
    accessTokenEncrypted: encryptToken(`zernio:${chosen.id}`),
    tokenExpiresAt: null,
    connectionStatus: "connected" as const,
    lastVerifiedAt: now,
    updatedAt: now,
  };

  let activeId = existingId;
  if (existingId) {
    await db
      .update(instagramAccounts)
      .set(values)
      .where(eq(instagramAccounts.id, existingId));
  } else {
    const [created] = await db
      .insert(instagramAccounts)
      .values(values)
      .returning({ id: instagramAccounts.id });
    activeId = created?.id;
  }

  if (!activeId) {
    throw new Error("Não foi possível salvar a conta da Zernio.");
  }

  // Apenas uma conta por provedor fica ativa (o motor trabalha com uma).
  await db
    .update(instagramAccounts)
    .set({ connectionStatus: "disconnected", updatedAt: now })
    .where(
      and(
        eq(instagramAccounts.provider, "zernio"),
        ne(instagramAccounts.id, activeId),
      ),
    );
}

/** Evita duplicar conta quando o mesmo perfil já foi vinculado antes. */
async function findExistingAccountId(
  providerAccountId: string,
  instagramUserId: string,
): Promise<string | undefined> {
  const db = getDb();
  const [byProvider] = await db
    .select({ id: instagramAccounts.id })
    .from(instagramAccounts)
    .where(eq(instagramAccounts.providerAccountId, providerAccountId))
    .limit(1);
  if (byProvider) return byProvider.id;

  const [byInstagramId] = await db
    .select({ id: instagramAccounts.id })
    .from(instagramAccounts)
    .where(eq(instagramAccounts.instagramUserId, instagramUserId))
    .limit(1);
  return byInstagramId?.id;
}

/** Cria (ou recria) o endpoint de webhook na Zernio apontando para este app. */
async function registerZernioWebhookFor(): Promise<void> {
  const url = zernioWebhookUrl();

  if (!isZernioConfigured() || !ZERNIO.webhookSecret || !url) {
    await setAppStateValue(
      "webhook_subscription_error",
      "Faltam ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET ou APP_URL para registrar o webhook.",
    );
    return;
  }

  try {
    // A Zernio não tem update nem delete de webhook: reaproveita o que já
    // aponta para esta URL em vez de criar um endpoint duplicado.
    const existing = await listWebhookSettings();
    const match = existing.find((webhook) => webhook.url === url);

    if (match && match.secret !== ZERNIO.webhookSecret) {
      await setAppStateValue(
        "webhook_subscription_error",
        "Já existe um webhook com esta URL na Zernio usando outro segredo. Apague-o no painel da Zernio e registre de novo.",
      );
      return;
    }

    const id =
      match?.id ??
      (
        await createWebhookSettings({
          name: "MARICHAT",
          url,
          secret: ZERNIO.webhookSecret,
          events: ZERNIO.webhookEvents,
        })
      ).id;

    await setAppStateValue("zernio_webhook_id", id);
    await clearAppStateValue("webhook_subscription_error");
    await setAppStateValue("webhook_subscribed_at", new Date().toISOString());
  } catch (error) {
    await setAppStateValue(
      "webhook_subscription_error",
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao registrar o webhook.",
    );
  }
}

/** Botão "Registrar webhook" quando o transporte ativo é a Zernio. */
export async function registerZernioWebhook(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();
  if (!account || account.provider !== "zernio") {
    redirect("/admin/conexao?erro=conexao");
  }

  await registerZernioWebhookFor();
  revalidatePath(CONNECTION_PATH);
  redirect("/admin/conexao?webhook=1");
}

/** Teste de conexão quando o transporte ativo é a Zernio. */
export async function testZernioConnection(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();

  const result = await runZernioConnectionTest(
    account?.provider === "zernio" ? account : null,
  );
  await setAppStateValue(CONNECTION_TEST_KEY, result);

  revalidatePath(CONNECTION_PATH);
  revalidatePath(ADMIN_PATH);
  redirect("/admin/conexao?testado=1");
}
