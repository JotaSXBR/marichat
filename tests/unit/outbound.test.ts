import { describe, expect, it } from "vitest";

import type { automations } from "@/lib/db/schema";
import {
  buildDirectLinkPayload,
  buildGatePayload,
  buildLinkPayload,
  buildOptionalLinkPayload,
  buildPrivateReplyPayload,
  truncateChars,
  truncateUtf8,
} from "@/lib/outbound";

function settings(
  overrides: Partial<typeof automations.$inferSelect> = {},
): typeof automations.$inferSelect {
  return {
    id: "automation-1",
    accountId: "account-1",
    name: "Automação",
    keyword: "Quero",
    mediaId: null,
    firstDmText: "Responda esta mensagem para receber o link.",
    firstDmButtonLabel: null,
    quickReplyTitle: "Quero o link",
    secondDmText: "Aqui está o link que você pediu",
    linkButtonTitle: "Abrir link",
    linkUrl: "https://www.exemplo.com/material",
    followMode: "off",
    followGateText:
      'Para liberar o link, siga o perfil e depois toque em "Já segui".',
    followGateFollowLabel: "Seguir agora",
    followGateConfirmLabel: "Já segui",
    followOptionalText:
      "Se quiser receber as próximas mensagens na caixa principal, siga o perfil. O link já está aqui:",
    followDirectText:
      "Aqui está o link. Se seguir o perfil, as próximas mensagens chegam na caixa principal.",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

type PrivateReply = {
  recipient: { comment_id: string };
  message: { text: string; quick_replies?: unknown };
};

type LinkPayload = {
  recipient: { id: string };
  message: {
    attachment: {
      type: string;
      payload: {
        template_type: string;
        elements: Array<{
          title: string;
          buttons: Array<{ type: string; url: string; title: string }>;
        }>;
      };
    };
  };
};

type GatePayload = {
  recipient: { id: string };
  message: {
    attachment: {
      type: string;
      payload: {
        template_type: string;
        text: string;
        buttons: Array<{
          type: string;
          url?: string;
          title: string;
          payload?: string;
        }>;
      };
    };
  };
};

describe("outbound: corpos enviados à API", () => {
  it("primeira DM é texto puro, sem botão", () => {
    const payload = buildPrivateReplyPayload(
      settings(),
      "comment-1",
      "token-1",
    ) as PrivateReply;

    expect(payload.recipient).toEqual({ comment_id: "comment-1" });
    expect(payload.message.text).toBe(
      "Responda esta mensagem para receber o link.",
    );
    expect(payload.message).not.toHaveProperty("quick_replies");
  });

  it("primeira DM respeita o limite de 1.000 bytes", () => {
    const payload = buildPrivateReplyPayload(
      settings({ firstDmText: "á".repeat(600) }),
      "comment-1",
      "token-1",
    ) as PrivateReply;

    expect(Buffer.byteLength(payload.message.text, "utf8")).toBeLessThanOrEqual(
      1000,
    );
  });

  it("primeira DM com botão usa postback com o token da interação", () => {
    const payload = buildPrivateReplyPayload(
      settings({ firstDmButtonLabel: "Quero o link" }),
      "comment-1",
      "token-1",
    ) as {
      recipient: { comment_id: string };
      message: {
        attachment: {
          type: string;
          payload: {
            template_type: string;
            text: string;
            buttons: Array<{
              type: string;
              title: string;
              payload: string;
            }>;
          };
        };
      };
    };

    expect(payload.recipient).toEqual({ comment_id: "comment-1" });
    expect(payload.message.attachment.payload.template_type).toBe("button");
    expect(payload.message.attachment.payload.text).toBe(
      "Responda esta mensagem para receber o link.",
    );
    expect(payload.message.attachment.payload.buttons).toEqual([
      { type: "postback", title: "Quero o link", payload: "link:token-1" },
    ]);
  });

  it("segunda DM é template genérico com botão HTTPS", () => {
    const payload = buildLinkPayload(settings(), "user-1") as LinkPayload;
    const element = payload.message.attachment.payload.elements[0]!;

    expect(payload.recipient).toEqual({ id: "user-1" });
    expect(payload.message.attachment.type).toBe("template");
    expect(payload.message.attachment.payload.template_type).toBe("generic");
    expect(element.title).toBe("Aqui está o link que você pediu");
    expect(element.buttons[0]).toEqual({
      type: "web_url",
      url: "https://www.exemplo.com/material",
      title: "Abrir link",
    });
  });

  it("segunda DM corta título e botão nos limites da Meta", () => {
    const payload = buildLinkPayload(
      settings({
        secondDmText: "x".repeat(120),
        linkButtonTitle: "y".repeat(40),
      }),
      "user-1",
    ) as LinkPayload;
    const element = payload.message.attachment.payload.elements[0]!;

    expect(element.title).toHaveLength(80);
    expect(element.buttons[0]!.title).toHaveLength(20);
  });

  it("porta de seguidor tem botão de perfil e postback com token", () => {
    const payload = buildGatePayload({
      settings: settings(),
      username: "conta_teste",
      senderId: "user-1",
      token: "token-123",
    }) as GatePayload;
    const { text, buttons } = payload.message.attachment.payload;

    expect(payload.message.attachment.payload.template_type).toBe("button");
    expect(text).toContain("Já segui");
    expect(buttons[0]).toEqual({
      type: "web_url",
      url: "https://www.instagram.com/conta_teste/",
      title: "Seguir agora",
    });
    expect(buttons[1]).toEqual({
      type: "postback",
      title: "Já segui",
      payload: "gate:token-123",
    });
  });

  it("modo opcional entrega seguir + link na mesma mensagem", () => {
    const payload = buildOptionalLinkPayload({
      settings: settings(),
      username: "conta_teste",
      senderId: "user-1",
    }) as GatePayload;
    const { template_type, text, buttons } = payload.message.attachment.payload;

    expect(template_type).toBe("button");
    expect(text).toContain("caixa principal");
    expect(buttons).toEqual([
      {
        type: "web_url",
        url: "https://www.instagram.com/conta_teste/",
        title: "Seguir agora",
      },
      {
        type: "web_url",
        url: "https://www.exemplo.com/material",
        title: "Abrir link",
      },
    ]);
  });

  it("modo direto leva só o link e o aviso sobre a caixa principal", () => {
    const payload = buildDirectLinkPayload({
      settings: settings(),
      senderId: "user-1",
    }) as GatePayload;
    const { template_type, text, buttons } = payload.message.attachment.payload;

    expect(template_type).toBe("button");
    expect(text).toContain("caixa principal");
    expect(buttons).toEqual([
      {
        type: "web_url",
        url: "https://www.exemplo.com/material",
        title: "Abrir link",
      },
    ]);
  });

  it("trunca UTF-8 sem quebrar caracteres", () => {
    expect(truncateUtf8("ação", 3)).toBe("aç");
    expect(truncateChars("ação", 3)).toBe("açã");
    expect(truncateUtf8("abc", 10)).toBe("abc");
  });
});
