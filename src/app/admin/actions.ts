"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getActiveAccount,
  getAccountToken,
  setAppStateValue,
  zernioWebhookUrl,
} from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import { automations, instagramAccounts } from "@/lib/db/schema";
import { FOLLOW_MODES } from "@/lib/follow-mode";
import { readText } from "@/lib/form-data";
import { getSubscribedApps, subscribeWebhooks } from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";
import {
  CONNECTION_TEST_KEY,
  runConnectionTest,
} from "@/lib/instagram/diagnostics";
import { normalizeKeyword } from "@/lib/matching";
import {
  createWebhookSettings,
  listInstagramAccounts,
} from "@/lib/zernio/client";
import { ZERNIO, isZernioConfigured } from "@/lib/zernio/config";
import { runZernioConnectionTest } from "@/lib/zernio/diagnostics";

/** AÃ§Ãµes do painel. Todas revalidam a autenticaÃ§Ã£o no servidor. */

const ADMIN_PATH = "/admin";
const CONNECTION_PATH = "/admin/conexao";

export type AutomationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function countChars(value: string): number {
  return [...value].length;
}

const httpsUrl = z
  .string()
  .trim()
  .min(1, "Informe a URL do link.")
  .max(2000, "URL muito longa.")
  .refine(
    (value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "A URL precisa comeÃ§ar com https:// e ser vÃ¡lida." },
  );

const automationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "DÃª um nome para identificar a automaÃ§Ã£o.")
    .max(80, "Use no mÃ¡ximo 80 caracteres."),
  keyword: z
    .string()
    .trim()
    .min(1, "Informe a palavra-chave.")
    .max(80, "Use no mÃ¡ximo 80 caracteres.")
    .refine((value) => normalizeKeyword(value).length > 0, {
      message: "A palavra-chave precisa ter letras ou nÃºmeros.",
    }),
  mediaId: z
    .string()
    .trim()
    .max(120, "Identificador de publicaÃ§Ã£o invÃ¡lido.")
    .optional(),
  firstDmText: z
    .string()
    .trim()
    .min(1, "Escreva a primeira mensagem.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 1000, {
      message: "A primeira mensagem pode ter no mÃ¡ximo 1.000 bytes.",
    }),
  secondDmText: z
    .string()
    .trim()
    .min(1, "Escreva o texto da segunda mensagem.")
    .refine((value) => countChars(value) <= 80, {
      message: "O texto da segunda mensagem pode ter no mÃ¡ximo 80 caracteres.",
    }),
  linkButtonTitle: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botÃ£o do link.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botÃ£o do link pode ter no mÃ¡ximo 20 caracteres.",
    }),
  linkUrl: httpsUrl,
  followMode: z.enum(FOLLOW_MODES),
  followGateText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem da porta de seguidor.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem da porta de seguidor pode ter no mÃ¡ximo 640 bytes.",
    }),
  followGateFollowLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botÃ£o de seguir.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botÃ£o pode ter no mÃ¡ximo 20 caracteres.",
    }),
  followGateConfirmLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botÃ£o de confirmaÃ§Ã£o.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botÃ£o pode ter no mÃ¡ximo 20 caracteres.",
    }),
  followOptionalText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo opcional.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo opcional pode ter no mÃ¡ximo 640 bytes.",
    }),
  followDirectText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo direto.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo direto pode ter no mÃ¡ximo 640 bytes.",
    }),
  isActive: z.boolean(),
});

const DEFAULT_GATE_TEXT =
  'Para liberar o link, siga o perfil e depois toque em "JÃ¡ segui". Se preferir, toque em "Seguir agora".';
const DEFAULT_OPTIONAL_TEXT =
  "Se quiser receber as prÃ³ximas mensagens na caixa principal, siga o perfil. O link jÃ¡ estÃ¡ aqui:";
const DEFAULT_DIRECT_TEXT =
  "Aqui estÃ¡ o link. Se seguir o perfil, as prÃ³ximas mensagens chegam na caixa principal.";

function readForm(formData: FormData) {
  return {
    name: readText(formData, "name"),
    keyword: readText(formData, "keyword"),
    mediaId: readText(formData, "mediaId"),
    firstDmText: readText(formData, "firstDmText"),
    secondDmText: readText(formData, "secondDmText"),
    linkButtonTitle: readText(formData, "linkButtonTitle"),
    linkUrl: readText(formData, "linkUrl"),
    followMode: readText(formData, "followMode") || "off",
    followGateText:
      readText(formData, "followGateText").trim() || DEFAULT_GATE_TEXT,
    followGateFollowLabel:
      readText(formData, "followGateFollowLabel").trim() || "Seguir agora",
    followGateConfirmLabel:
      readText(formData, "followGateConfirmLabel").trim() || "JÃ¡ segui",
    followOptionalText:
      readText(formData, "followOptionalText").trim() || DEFAULT_OPTIONAL_TEXT,
    followDirectText:
      readText(formData, "followDirectText").trim() || DEFAULT_DIRECT_TEXT,
    isActive: formData.get("isActive") === "on",
  };
}

export async function saveAutomation(
  _previous: AutomationFormState | undefined,
  formData: FormData,
): Promise<AutomationFormState> {
  await requireAdmin();

  const account = await getActiveAccount();
  if (!account) {
    return {
      error: "Conecte uma conta do Instagram antes de criar automaÃ§Ãµes.",
    };
  }

  const raw = readForm(formData);
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Revise os campos destacados." };
  }

  const values = parsed.data;
  const db = getDb();
  const id = readText(formData, "id").trim();
  const mediaId =
    values.mediaId && values.mediaId.length > 0 ? values.mediaId : null;

  if (id) {
    const updated = await db
      .update(automations)
      .set({
        name: values.name,
        keyword: values.keyword,
        keywordNormalized: normalizeKeyword(values.keyword),
        mediaId,
        firstDmText: values.firstDmText,
        secondDmText: values.secondDmText,
        linkButtonTitle: values.linkButtonTitle,
        linkUrl: values.linkUrl,
        followMode: values.followMode,
        followGateText: values.followGateText,
        followGateFollowLabel: values.followGateFollowLabel,
        followGateConfirmLabel: values.followGateConfirmLabel,
        followOptionalText: values.followOptionalText,
        followDirectText: values.followDirectText,
        isActive: values.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(automations.id, id), eq(automations.accountId, account.id)))
      .returning({ id: automations.id });

    if (updated.length === 0) {
      return { error: "AutomaÃ§Ã£o nÃ£o encontrada." };
    }
  } else {
    await db.insert(automations).values({
      accountId: account.id,
      name: values.name,
      keyword: values.keyword,
      keywordNormalized: normalizeKeyword(values.keyword),
      mediaId,
      firstDmText: values.firstDmText,
      secondDmText: values.secondDmText,
      linkButtonTitle: values.linkButtonTitle,
      linkUrl: values.linkUrl,
      followMode: values.followMode,
      followGateText: values.followGateText,
      followGateFollowLabel: values.followGateFollowLabel,
      followGateConfirmLabel: values.followGateConfirmLabel,
      followOptionalText: values.followOptionalText,
      followDirectText: values.followDirectText,
      isActive: values.isActive,
    });
  }

  revalidatePath("/admin/automacoes");
  revalidatePath(ADMIN_PATH);
  redirect("/admin/automacoes?ok=1");
}

export async function toggleAutomation(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = readText(formData, "id");
  const activate = formData.get("activate") === "1";
  if (!id) return;

  const db = getDb();
  await db
    .update(automations)
    .set({ isActive: activate, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath("/admin/automacoes");
  revalidatePath(ADMIN_PATH);
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

  try {
    const accessToken = getAccountToken(account);
    await subscribeWebhooks({
      igUserId: account.instagramUserId,
      accessToken,
    });

    // A Meta responde apenas {"success": true}. Lemos de volta para confirmar
    // que os campos aparecem na inscriÃ§Ã£o da conta.
    const apps = await getSubscribedApps({
      igUserId: account.instagramUserId,
      accessToken,
    });
    const fields = new Set(apps.flatMap((app) => app.subscribedFields));
    const missing = IG.webhookFields.filter((field) => !fields.has(field));

    if (missing.length > 0) {
      await setAppStateValue(
        "webhook_subscription_error",
        `A Meta aceitou a inscriÃ§Ã£o, mas estes campos nÃ£o aparecem: ${missing.join(", ")}. Confira as assinaturas do app no painel da Meta.`,
      );
    } else {
      await setAppStateValue("webhook_subscription_error", null);
      await setAppStateValue("webhook_subscribed_at", new Date().toISOString());
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    await setAppStateValue("webhook_subscription_error", message);
  }

  revalidatePath(CONNECTION_PATH);
  redirect(CONNECTION_PATH);
}

/**
 * Confere token e campos de webhook assinados, guardando o resultado para a
 * pÃ¡gina de ConexÃ£o. NÃ£o envia mensagens nem altera automaÃ§Ãµes.
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
 * Vincula uma conta do Instagram que jÃ¡ estÃ¡ conectada dentro da Zernio.
 *
 * A Zernio cuida do OAuth e do token; guardamos apenas o `accountId` dela e
 * um marcador cifrado no lugar do token (o campo Ã© obrigatÃ³rio no schema e a
 * leitura do token Ã© ignorada quando `provider = zernio`).
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
    await setAppStateValue(
      "zernio_connection_error",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    redirect("/admin/conexao?erro=zernio-api");
  }

  if (accounts.length === 0) {
    redirect("/admin/conexao?erro=zernio-conta");
  }

  const requestedId = readText(formData, "accountId").trim();
  const chosen = requestedId
    ? accounts.find((item) => item.id === requestedId)
    : accounts.length === 1
      ? accounts[0]
      : null;

  if (!chosen) {
    redirect("/admin/conexao?erro=zernio-escolha");
  }

  const instagramUserId =
    chosen.platformUserId ?? chosen.instagramScopedId ?? chosen.id;
  const now = new Date();
  const db = getDb();

  const [existingByProvider] = await db
    .select({ id: instagramAccounts.id })
    .from(instagramAccounts)
    .where(eq(instagramAccounts.providerAccountId, chosen.id))
    .limit(1);

  const [existingById] = await db
    .select({ id: instagramAccounts.id })
    .from(instagramAccounts)
    .where(eq(instagramAccounts.instagramUserId, instagramUserId))
    .limit(1);

  const existingId = existingByProvider?.id ?? existingById?.id;

  const values = {
    provider: "zernio",
    providerAccountId: chosen.id,
    instagramUserId,
    username: chosen.username ?? "instagram",
    accessTokenEncrypted: encryptToken(`zernio:${chosen.id}`),
    tokenExpiresAt: null,
    connectionStatus: "connected",
    lastVerifiedAt: now,
    updatedAt: now,
  };

  let activeId = existingId;

  try {
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
  } catch (error) {
    await setAppStateValue(
      "zernio_connection_error",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    redirect("/admin/conexao?erro=zernio-salvar");
  }

  if (!activeId) {
    redirect("/admin/conexao?erro=zernio-salvar");
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

  await setAppStateValue("zernio_connection_error", null);
  await setAppStateValue("webhook_subscription_error", null);
  await setAppStateValue("webhook_subscribed_at", now.toISOString());

  revalidatePath(CONNECTION_PATH);
  revalidatePath(ADMIN_PATH);
  redirect(
    `/admin/conexao?ok=1&conta=${encodeURIComponent(chosen.username ?? "")}`,
  );
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
    const created = await createWebhookSettings({
      name: "MARICHAT",
      url,
      secret: ZERNIO.webhookSecret,
      events: ZERNIO.webhookEvents,
    });
    await setAppStateValue("zernio_webhook_id", created.id);
    await setAppStateValue("webhook_subscription_error", null);
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

/** BotÃ£o "Registrar webhook" quando o transporte ativo Ã© a Zernio. */
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

/** Teste de conexÃ£o quando o transporte ativo Ã© a Zernio. */
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
