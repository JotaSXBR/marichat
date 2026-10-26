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

/** Ações do painel. Todas revalidam a autenticação no servidor. */

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
    { message: "A URL precisa começar com https:// e ser válida." },
  );

const automationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome para identificar a automação.")
    .max(80, "Use no máximo 80 caracteres."),
  keyword: z
    .string()
    .trim()
    .min(1, "Informe a palavra-chave.")
    .max(80, "Use no máximo 80 caracteres.")
    .refine((value) => normalizeKeyword(value).length > 0, {
      message: "A palavra-chave precisa ter letras ou números.",
    }),
  mediaId: z
    .string()
    .trim()
    .max(120, "Identificador de publicação inválido.")
    .optional(),
  firstDmText: z
    .string()
    .trim()
    .min(1, "Escreva a primeira mensagem.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 1000, {
      message: "A primeira mensagem pode ter no máximo 1.000 bytes.",
    }),
  secondDmText: z
    .string()
    .trim()
    .min(1, "Escreva o texto da segunda mensagem.")
    .refine((value) => countChars(value) <= 80, {
      message: "O texto da segunda mensagem pode ter no máximo 80 caracteres.",
    }),
  linkButtonTitle: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão do link.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão do link pode ter no máximo 20 caracteres.",
    }),
  linkUrl: httpsUrl,
  followMode: z.enum(FOLLOW_MODES),
  followGateText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem da porta de seguidor.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem da porta de seguidor pode ter no máximo 640 bytes.",
    }),
  followGateFollowLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão de seguir.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão pode ter no máximo 20 caracteres.",
    }),
  followGateConfirmLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão de confirmação.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão pode ter no máximo 20 caracteres.",
    }),
  followOptionalText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo opcional.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo opcional pode ter no máximo 640 bytes.",
    }),
  followDirectText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo direto.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo direto pode ter no máximo 640 bytes.",
    }),
  isActive: z.boolean(),
});

const DEFAULT_GATE_TEXT =
  'Para liberar o link, siga o perfil e depois toque em "Já segui". Se preferir, toque em "Seguir agora".';
const DEFAULT_OPTIONAL_TEXT =
  "Se quiser receber as próximas mensagens na caixa principal, siga o perfil. O link já está aqui:";
const DEFAULT_DIRECT_TEXT =
  "Aqui está o link. Se seguir o perfil, as próximas mensagens chegam na caixa principal.";

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    keyword: String(formData.get("keyword") ?? ""),
    mediaId: String(formData.get("mediaId") ?? ""),
    firstDmText: String(formData.get("firstDmText") ?? ""),
    secondDmText: String(formData.get("secondDmText") ?? ""),
    linkButtonTitle: String(formData.get("linkButtonTitle") ?? ""),
    linkUrl: String(formData.get("linkUrl") ?? ""),
    followMode: String(formData.get("followMode") ?? "off"),
    followGateText: String(formData.get("followGateText") ?? "").trim()
      ? String(formData.get("followGateText") ?? "")
      : DEFAULT_GATE_TEXT,
    followGateFollowLabel:
      String(formData.get("followGateFollowLabel") ?? "").trim() || "Seguir agora",
    followGateConfirmLabel:
      String(formData.get("followGateConfirmLabel") ?? "").trim() || "Já segui",
    followOptionalText: String(formData.get("followOptionalText") ?? "").trim()
      ? String(formData.get("followOptionalText") ?? "")
      : DEFAULT_OPTIONAL_TEXT,
    followDirectText: String(formData.get("followDirectText") ?? "").trim()
      ? String(formData.get("followDirectText") ?? "")
      : DEFAULT_DIRECT_TEXT,
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
    return { error: "Conecte uma conta do Instagram antes de criar automações." };
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
  const id = String(formData.get("id") ?? "").trim();
  const mediaId = values.mediaId && values.mediaId.length > 0 ? values.mediaId : null;

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
      .where(
        and(eq(automations.id, id), eq(automations.accountId, account.id)),
      )
      .returning({ id: automations.id });

    if (updated.length === 0) {
      return { error: "Automação não encontrada." };
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
  revalidatePath("/admin");
  redirect("/admin/automacoes?ok=1");
}

export async function toggleAutomation(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const activate = formData.get("activate") === "1";
  if (!id) return;

  const db = getDb();
  await db
    .update(automations)
    .set({ isActive: activate, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath("/admin/automacoes");
  revalidatePath("/admin");
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

  revalidatePath("/admin/conexao");
  revalidatePath("/admin");
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
    revalidatePath("/admin/conexao");
    redirect("/admin/conexao?webhook=1");
  }

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
      await setAppStateValue("webhook_subscription_error", null);
      await setAppStateValue("webhook_subscribed_at", new Date().toISOString());
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    await setAppStateValue("webhook_subscription_error", message);
  }

  revalidatePath("/admin/conexao");
  redirect("/admin/conexao");
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

  revalidatePath("/admin/conexao");
  revalidatePath("/admin");
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
    await setAppStateValue(
      "zernio_connection_error",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    redirect("/admin/conexao?erro=zernio-api");
  }

  if (accounts.length === 0) {
    redirect("/admin/conexao?erro=zernio-conta");
  }

  const requestedId = String(formData.get("accountId") ?? "").trim();
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

  try {
    if (existingId) {
      await db
        .update(instagramAccounts)
        .set(values)
        .where(eq(instagramAccounts.id, existingId));
    } else {
      await db.insert(instagramAccounts).values(values);
    }
  } catch (error) {
    await setAppStateValue(
      "zernio_connection_error",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    redirect("/admin/conexao?erro=zernio-salvar");
  }

  // Apenas uma conta por provedor fica ativa (o motor trabalha com uma).
  await db
    .update(instagramAccounts)
    .set({ connectionStatus: "disconnected", updatedAt: now })
    .where(
      and(
        eq(instagramAccounts.provider, "zernio"),
        ne(instagramAccounts.id, existingId ?? "00000000-0000-0000-0000-000000000000"),
      ),
    );

  await setAppStateValue("zernio_connection_error", null);
  await setAppStateValue("webhook_subscription_error", null);
  await setAppStateValue("webhook_subscribed_at", now.toISOString());

  revalidatePath("/admin/conexao");
  revalidatePath("/admin");
  redirect(`/admin/conexao?ok=1&conta=${encodeURIComponent(chosen.username ?? "")}`);
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

/** Botão "Registrar webhook" quando o transporte ativo é a Zernio. */
export async function registerZernioWebhook(): Promise<void> {
  await requireAdmin();
  const account = await getActiveAccount();
  if (!account || account.provider !== "zernio") {
    redirect("/admin/conexao?erro=conexao");
  }

  await registerZernioWebhookFor();
  revalidatePath("/admin/conexao");
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

  revalidatePath("/admin/conexao");
  revalidatePath("/admin");
  redirect("/admin/conexao?testado=1");
}
