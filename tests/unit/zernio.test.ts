import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { buildGatePayload, buildLinkPayload, toZernioMessage } from "@/lib/outbound";
import { getFollowStatus } from "@/lib/zernio/client";
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

describe("cliente da Zernio", () => {
  it("monta a URL do status de seguidor com a base uma única vez", async () => {
    let calledUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        calledUrl = String(input);
        return new Response(JSON.stringify({ isFollower: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const result = await getFollowStatus({
      accountId: "acc 1",
      userId: "user/1",
      refresh: true,
    });

    expect(calledUrl).toBe(
      "https://zernio.com/api/v1/accounts/acc%201/follow-status/user%2F1?refresh=true",
    );
    expect(result.isFollowing).toBe(true);
    vi.unstubAllGlobals();
  });

  it("trata isFollower nulo como desconhecido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            isFollower: null,
            unavailableReason: "consent_required",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await getFollowStatus({ accountId: "a", userId: "u" });

    expect(result.isFollowing).toBeNull();
    expect(result.unavailableReason).toBe("consent_required");
    vi.unstubAllGlobals();
  });
});
