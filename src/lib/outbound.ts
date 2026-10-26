import type { automations } from "@/lib/db/schema";

/**
 * Montagem dos corpos enviados à API do Instagram.
 *
 * Ficam separados do webhook e da fila porque os dois lados precisam do mesmo
 * formato: o webhook agenda a primeira DM e a porta de seguidor; o drenador
 * agenda o link e a mensagem de confirmação.
 */

type AutomationSettings = typeof automations.$inferSelect;

export const MAX_TEXT_BYTES = 1000;
export const MAX_BUTTON_TEXT_BYTES = 640;
export const MAX_TEMPLATE_TITLE_CHARS = 80;
export const MAX_BUTTON_TITLE_CHARS = 20;

export function truncateUtf8(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  let result = "";
  for (const char of text) {
    if (Buffer.byteLength(result + char, "utf8") > maxBytes) break;
    result += char;
  }
  return result;
}

export function truncateChars(text: string, maxChars: number): string {
  return [...text].slice(0, maxChars).join("");
}

/** Primeira DM: resposta privada ao comentário, sempre em texto puro. */
export function buildPrivateReplyPayload(
  settings: AutomationSettings,
  commentId: string,
): unknown {
  return {
    recipient: { comment_id: commentId },
    message: { text: truncateUtf8(settings.firstDmText, MAX_TEXT_BYTES) },
  };
}

/** Segunda DM: o link, em template genérico com botão HTTPS. */
export function buildLinkPayload(
  settings: AutomationSettings,
  senderId: string,
): unknown {
  const title = truncateChars(settings.secondDmText, MAX_TEMPLATE_TITLE_CHARS);
  const buttonTitle = truncateChars(
    settings.linkButtonTitle,
    MAX_BUTTON_TITLE_CHARS,
  );

  return {
    recipient: { id: senderId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title,
              buttons: [
                {
                  type: "web_url",
                  url: settings.linkUrl,
                  title: buttonTitle,
                },
              ],
            },
          ],
        },
      },
    },
  };
}

/**
 * Porta de seguidor: botão para abrir o perfil e botão "Já segui" (postback).
 * O postback carrega um token opaco que identifica a interação.
 */
export function buildGatePayload(params: {
  settings: AutomationSettings;
  username: string;
  senderId: string;
  token: string;
}): unknown {
  const { settings, username, senderId, token } = params;

  return {
    recipient: { id: senderId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: truncateUtf8(settings.followGateText, MAX_BUTTON_TEXT_BYTES),
          buttons: [
            {
              type: "web_url",
              url: `https://www.instagram.com/${username}/`,
              title: truncateChars(
                settings.followGateFollowLabel,
                MAX_BUTTON_TITLE_CHARS,
              ),
            },
            {
              type: "postback",
              title: truncateChars(
                settings.followGateConfirmLabel,
                MAX_BUTTON_TITLE_CHARS,
              ),
              payload: `gate:${token}`,
            },
          ],
        },
      },
    },
  };
}
