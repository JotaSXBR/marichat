import "server-only";

import { and, desc, eq, notInArray } from "drizzle-orm";

import type { Account } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { commentInteractions } from "@/lib/db/schema";
import { isFollowMode, type FollowMode } from "@/lib/follow-mode";
import { IG } from "@/lib/instagram/config";
import {
  buildDirectLinkPayload,
  buildLinkPayload,
  buildOptionalLinkPayload,
} from "@/lib/outbound";
import { fullAutomation } from "@/lib/webhook/automation";
import { enqueueOutbound, rescheduleFollowCheck } from "@/lib/webhook/outbox";
import type {
  InboundMessage,
  InteractionRow,
  Outcome,
} from "@/lib/webhook/types";

/** Estados em que a interação já terminou e não aceita novas mensagens. */
const CLOSED_STATES = new Set(["link_sent", "expired", "failed", "canceled"]);

type AutomationSettings = NonNullable<
  Awaited<ReturnType<typeof fullAutomation>>
>;

/** Payload do botão da primeira DM e do "Já segui" (aceita quick reply antigo). */
function gateToken(message: InboundMessage): string | null {
  const quickReplyPayload = message.message?.quick_reply?.payload;
  if (quickReplyPayload) return quickReplyPayload;

  const postbackPayload = message.postback?.payload;
  if (postbackPayload?.startsWith("gate:")) {
    return postbackPayload.slice("gate:".length);
  }
  if (postbackPayload?.startsWith("link:")) {
    return postbackPayload.slice("link:".length);
  }
  return null;
}

function isGateTap(message: InboundMessage, interaction: InteractionRow) {
  return message.postback?.payload === `gate:${interaction.token}`;
}

function modeOf(settings: AutomationSettings): FollowMode {
  return isFollowMode(settings.followMode) ? settings.followMode : "off";
}

/**
 * Qualquer mensagem do usuário atualiza a janela de 24h das interações
 * conhecidas dele (não é necessário ser um toque em botão).
 */
async function touchInteractionWindow(params: {
  accountId: string;
  senderId: string;
  receivedAt: Date;
  conversationId?: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(commentInteractions)
    .set({
      userLastMessageAt: params.receivedAt,
      ...(params.conversationId
        ? { providerConversationId: params.conversationId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commentInteractions.accountId, params.accountId),
        eq(commentInteractions.commenterIgsid, params.senderId),
      ),
    );
}

async function findInteraction(params: {
  accountId: string;
  senderId: string;
  token: string | null;
}): Promise<InteractionRow | undefined> {
  const db = getDb();

  if (params.token) {
    const [interaction] = await db
      .select()
      .from(commentInteractions)
      .where(
        and(
          eq(commentInteractions.accountId, params.accountId),
          eq(commentInteractions.token, params.token),
          eq(commentInteractions.commenterIgsid, params.senderId),
        ),
      )
      .limit(1);
    return interaction;
  }

  // Texto livre: a interação aberta mais recente desta pessoa nesta conta.
  // Uma interação já encerrada (link enviado, expirada) não pode "roubar" a
  // resposta de outra que ainda espera.
  const [interaction] = await db
    .select()
    .from(commentInteractions)
    .where(
      and(
        eq(commentInteractions.accountId, params.accountId),
        eq(commentInteractions.commenterIgsid, params.senderId),
        notInArray(commentInteractions.state, [...CLOSED_STATES]),
      ),
    )
    .orderBy(desc(commentInteractions.createdAt))
    .limit(1);
  return interaction;
}

/** Enfileira o link conforme o modo (sem checagem de perfil). */
async function enqueueModeLink(params: {
  accountId: string;
  interactionId: string;
  senderId: string;
  settings: AutomationSettings;
  username: string;
  mode: "off" | "optional" | "direct";
}): Promise<boolean> {
  if (params.mode === "off") {
    return enqueueOutbound({
      accountId: params.accountId,
      interactionId: params.interactionId,
      kind: "followup_link",
      payload: buildLinkPayload(params.settings, params.senderId),
    });
  }

  if (params.mode === "optional") {
    return enqueueOutbound({
      accountId: params.accountId,
      interactionId: params.interactionId,
      kind: "link_optional",
      payload: buildOptionalLinkPayload({
        settings: params.settings,
        username: params.username,
        senderId: params.senderId,
      }),
    });
  }

  return enqueueOutbound({
    accountId: params.accountId,
    interactionId: params.interactionId,
    kind: "link_direct",
    payload: buildDirectLinkPayload({
      settings: params.settings,
      senderId: params.senderId,
    }),
  });
}

/** Toque em "Já segui" nos modos soft e locked. */
async function handleGateTap(params: {
  accountId: string;
  interaction: InteractionRow;
  settings: AutomationSettings;
  senderId: string;
  mode: FollowMode;
}): Promise<Outcome> {
  if (params.mode === "soft" && params.interaction.followChecks >= 2) {
    // No modo tolerante o limite libera o link de qualquer forma.
    const created = await enqueueOutbound({
      accountId: params.accountId,
      interactionId: params.interaction.id,
      kind: "followup_link",
      payload: buildLinkPayload(params.settings, params.senderId),
    });
    return created ? "processed" : "ignored";
  }

  if (
    params.mode === "locked" &&
    params.interaction.followChecks >= IG.maxLockedFollowChecks
  ) {
    // "Travado" é travado: depois do limite não insistimos com a Meta.
    return "ignored";
  }

  const created = await rescheduleFollowCheck({
    accountId: params.accountId,
    interactionId: params.interaction.id,
    payload: {
      check: params.interaction.followChecks + 1,
      senderId: params.senderId,
    },
    // Dá tempo para a Meta refletir o follow recém-feito.
    delayMs: IG.followCheckDelayMs,
  });
  return created ? "processed" : "ignored";
}

/**
 * Decide o próximo passo conforme o modo da automação congelada na interação.
 */
async function queueContinuation(params: {
  account: Account;
  message: InboundMessage;
  interaction: InteractionRow;
  settings: AutomationSettings;
  senderId: string;
}): Promise<Outcome> {
  const { account, message, interaction, settings, senderId } = params;
  const mode = modeOf(settings);

  try {
    if (mode === "off" || mode === "optional" || mode === "direct") {
      const created = await enqueueModeLink({
        accountId: account.id,
        interactionId: interaction.id,
        senderId,
        settings,
        username: account.username,
        mode,
      });
      return created ? "processed" : "ignored";
    }

    if (isGateTap(message, interaction)) {
      return await handleGateTap({
        accountId: account.id,
        interaction,
        settings,
        senderId,
        mode,
      });
    }

    if (interaction.state === "accepted" || interaction.state === "queued") {
      const created = await enqueueOutbound({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "follow_check",
        payload: { check: 1, senderId },
      });
      return created ? "processed" : "ignored";
    }

    // Ainda aguardando o toque em "Já segui": mensagens livres não geram
    // novas checagens.
    return "ignored";
  } catch (error) {
    console.error("[webhook] falha ao agendar a continuação:", error);
    return "failed";
  }
}

/** Quem mandou a mensagem, ou `null` se o evento não deve ser processado. */
function messageSender(
  account: Account,
  message: InboundMessage,
): string | null {
  const senderId = message.sender?.id;
  if (!senderId || senderId === account.instagramUserId) return null;
  if (message.message?.is_echo) return null;
  const mid = message.message?.mid ?? message.postback?.mid;
  return mid ? senderId : null;
}

/** A janela de 24h ainda está aberta? */
function isWithinWindow(
  interaction: InteractionRow,
  receivedAt: Date,
): boolean {
  const deadline =
    (interaction.userLastMessageAt ?? receivedAt).getTime() +
    IG.messagingWindowMs;
  return Date.now() < deadline;
}

/**
 * Mensagem recebida (texto livre ou toque em botão). Decide o próximo passo
 * conforme o modo da automação congelada na interação.
 */
export async function processInboundMessage(params: {
  account: Account;
  message: InboundMessage;
  /** Conversa no provedor (Zernio). Necessária para a DM 2. */
  conversationId?: string;
}): Promise<Outcome> {
  const { account, message } = params;
  const senderId = messageSender(account, message);
  if (!senderId) return "ignored";

  const receivedAt = message.timestamp
    ? new Date(message.timestamp * 1000)
    : new Date();

  await touchInteractionWindow({
    accountId: account.id,
    senderId,
    receivedAt,
    conversationId: params.conversationId,
  });

  const interaction = await findInteraction({
    accountId: account.id,
    senderId,
    token: gateToken(message),
  });

  if (!interaction || CLOSED_STATES.has(interaction.state)) return "ignored";
  if (!isWithinWindow(interaction, receivedAt)) return "ignored";

  const settings = await fullAutomation(interaction.automationId);
  if (!settings) return "ignored";

  return queueContinuation({
    account,
    message,
    interaction,
    settings,
    senderId,
  });
}
