"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveAccount, getAccountToken, setAppStateValue } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { automations, instagramAccounts } from "@/lib/db/schema";
import { subscribeWebhooks } from "@/lib/instagram/client";
import { normalizeKeyword } from "@/lib/matching";

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
  requireFollow: z.boolean(),
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
  isActive: z.boolean(),
});

const DEFAULT_GATE_TEXT =
  'Para liberar o link, siga o perfil e depois toque em "Já segui". Se preferir, toque em "Seguir agora".';

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    keyword: String(formData.get("keyword") ?? ""),
    mediaId: String(formData.get("mediaId") ?? ""),
    firstDmText: String(formData.get("firstDmText") ?? ""),
    secondDmText: String(formData.get("secondDmText") ?? ""),
    linkButtonTitle: String(formData.get("linkButtonTitle") ?? ""),
    linkUrl: String(formData.get("linkUrl") ?? ""),
    requireFollow: formData.get("requireFollow") === "on",
    followGateText: String(formData.get("followGateText") ?? "").trim()
      ? String(formData.get("followGateText") ?? "")
      : DEFAULT_GATE_TEXT,
    followGateFollowLabel:
      String(formData.get("followGateFollowLabel") ?? "").trim() || "Seguir agora",
    followGateConfirmLabel:
      String(formData.get("followGateConfirmLabel") ?? "").trim() || "Já segui",
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
        requireFollow: values.requireFollow,
        followGateText: values.followGateText,
        followGateFollowLabel: values.followGateFollowLabel,
        followGateConfirmLabel: values.followGateConfirmLabel,
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
      requireFollow: values.requireFollow,
      followGateText: values.followGateText,
      followGateFollowLabel: values.followGateFollowLabel,
      followGateConfirmLabel: values.followGateConfirmLabel,
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

  try {
    await subscribeWebhooks({
      igUserId: account.instagramUserId,
      accessToken: getAccountToken(account),
    });
    await setAppStateValue("webhook_subscription_error", null);
    await setAppStateValue("webhook_subscribed_at", new Date().toISOString());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    await setAppStateValue("webhook_subscription_error", message);
  }

  revalidatePath("/admin/conexao");
  redirect("/admin/conexao");
}
