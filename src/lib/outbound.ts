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

/**
 * Converte o corpo no formato da Meta (que os builders acima produzem) para o
 * formato da Zernio. Manter um único formato interno evita duplicar os textos,
 * os truncamentos e os testes: o provider só traduz o "envelope".
 */
export type ZernioButton =
  | { type: "url"; title: string; url: string }
  | { type: "postback"; title: string; payload: string };

export type ZernioMessage = { message: string; buttons?: ZernioButton[] };

type RawButton = {
  type?: unknown;
  title?: unknown;
  url?: unknown;
  payload?: unknown;
};

type TemplatePayload = {
  template_type?: unknown;
  text?: unknown;
  buttons?: RawButton[];
  elements?: Array<{ title?: unknown; buttons?: RawButton[] }>;
};

type PayloadRoot = {
  message?: {
    text?: unknown;
    attachment?: {
      type?: unknown;
      payload?: TemplatePayload;
    };
  };
};

/** Texto do template: campo `text` ou o título do primeiro elemento. */
function extractText(template: TemplatePayload): string {
  if (typeof template.text === "string") return template.text;
  const title = template.elements?.[0]?.title;
  return typeof title === "string" ? title : "";
}

/** Botões do primeiro elemento ou, na falta dele, os do próprio template. */
function pickButtons(template: TemplatePayload): RawButton[] {
  const elementButtons = template.elements?.[0]?.buttons;
  if (Array.isArray(elementButtons)) return elementButtons;
  return Array.isArray(template.buttons) ? template.buttons : [];
}

/** Traduz um botão da Meta; devolve `null` para formatos que não enviamos. */
function toButton(raw: RawButton): ZernioButton | null {
  if (typeof raw.title !== "string") return null;
  if (raw.type === "web_url" && typeof raw.url === "string") {
    return { type: "url", title: raw.title, url: raw.url };
  }
  if (raw.type === "postback" && typeof raw.payload === "string") {
    return { type: "postback", title: raw.title, payload: raw.payload };
  }
  return null;
}

export function toZernioMessage(payload: unknown): ZernioMessage {
  const message = (payload as PayloadRoot | null)?.message;
  if (message && typeof message.text === "string") {
    return { message: message.text };
  }

  const template = message?.attachment?.payload;

  if (message?.attachment?.type !== "template" || !template) {
    throw new Error("Formato de mensagem não suportado pela Zernio.");
  }

  const text = extractText(template);
  if (!text) {
    throw new Error("Mensagem sem texto para a Zernio.");
  }

  const buttons = pickButtons(template)
    .map(toButton)
    .filter((button): button is ZernioButton => button !== null);

  return buttons.length > 0 ? { message: text, buttons } : { message: text };
}

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

/**
 * Modo opcional ("fala uma vez"): pede para seguir e já entrega o link, sem
 * consultar o perfil. Dois botões de URL — o primeiro abre o perfil, o segundo
 * abre o link.
 */
export function buildOptionalLinkPayload(params: {
  settings: AutomationSettings;
  username: string;
  senderId: string;
}): unknown {
  const { settings, username, senderId } = params;

  return {
    recipient: { id: senderId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: truncateUtf8(
            settings.followOptionalText,
            MAX_BUTTON_TEXT_BYTES,
          ),
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
              type: "web_url",
              url: settings.linkUrl,
              title: truncateChars(
                settings.linkButtonTitle,
                MAX_BUTTON_TITLE_CHARS,
              ),
            },
          ],
        },
      },
    },
  };
}

/**
 * Modo direto: só o link, com o aviso de que seguir o perfil muda a caixa em
 * que as próximas mensagens aparecem. Um único botão de URL.
 */
export function buildDirectLinkPayload(params: {
  settings: AutomationSettings;
  senderId: string;
}): unknown {
  const { settings, senderId } = params;

  return {
    recipient: { id: senderId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: truncateUtf8(settings.followDirectText, MAX_BUTTON_TEXT_BYTES),
          buttons: [
            {
              type: "web_url",
              url: settings.linkUrl,
              title: truncateChars(
                settings.linkButtonTitle,
                MAX_BUTTON_TITLE_CHARS,
              ),
            },
          ],
        },
      },
    },
  };
}
