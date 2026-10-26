import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildGatePayload, buildLinkPayload, toZernioMessage } from "@/lib/outbound";
import { verifyZernioSignature } from "@/lib/zernio/signature";

const secret = "segredo-do-webhook";

describe("assinatura do webhook da Zernio", () => {
  it("aceita o HMAC hexadecimal do corpo cru", () => {
    const body = JSON.stringify({ event: "comment.received" });
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    expect(
      verifyZernioSignature({ rawBody: body, signature, secret }),
    ).toBe(true);
  });

  it("rejeita corpo alterado, segredo errado e cabeçalho ausente", () => {
    const body = "{}";
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    expect(
      verifyZernioSignature({ rawBody: `${body} `, signature, secret }),
    ).toBe(false);
    expect(
      verifyZernioSignature({ rawBody: body, signature, secret: "outro" }),
    ).toBe(false);
    expect(
      verifyZernioSignature({ rawBody: body, signature: null, secret }),
    ).toBe(false);
  });

  it("aceita assinatura com espaços e maiúsculas", () => {
    const body = '{"ok":true}';
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    expect(
      verifyZernioSignature({
        rawBody: body,
        signature: ` ${signature.toUpperCase()} `,
        secret,
      }),
    ).toBe(true);
  });
});

describe("tradução do corpo Meta para a Zernio", () => {
  it("texto puro vira só message", () => {
    expect(
      toZernioMessage({
        recipient: { comment_id: "c1" },
        message: { text: "Responda esta mensagem" },
      }),
    ).toEqual({ message: "Responda esta mensagem" });
  });

  it("template de botão vira message + buttons", () => {
    const payload = buildGatePayload({
      settings: {
        followGateText: "Siga e toque em Já segui",
        followGateFollowLabel: "Seguir agora",
        followGateConfirmLabel: "Já segui",
      } as never,
      username: "conta_teste",
      senderId: "user-1",
      token: "abc",
    });

    expect(toZernioMessage(payload)).toEqual({
      message: "Siga e toque em Já segui",
      buttons: [
        {
          type: "url",
          title: "Seguir agora",
          url: "https://www.instagram.com/conta_teste/",
        },
        { type: "postback", title: "Já segui", payload: "gate:abc" },
      ],
    });
  });

  it("template genérico usa o título do primeiro elemento", () => {
    const payload = buildLinkPayload(
      {
        secondDmText: "Aqui está o link",
        linkButtonTitle: "Abrir link",
        linkUrl: "https://www.exemplo.com/material",
      } as never,
      "user-1",
    );

    expect(toZernioMessage(payload)).toEqual({
      message: "Aqui está o link",
      buttons: [
        {
          type: "url",
          title: "Abrir link",
          url: "https://www.exemplo.com/material",
        },
      ],
    });
  });

  it("recusa formato desconhecido", () => {
    expect(() => toZernioMessage({ message: {} })).toThrow();
    expect(() => toZernioMessage(null)).toThrow();
  });
});
