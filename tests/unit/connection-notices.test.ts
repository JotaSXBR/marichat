import { describe, expect, it } from "vitest";

import {
  buildConnectionNotices,
  subscriptionLine,
  tokenLine,
} from "@/app/admin/conexao/connection-utils";

const test = {
  tokenOk: true,
  subscriptionChecked: true,
  missingFields: [] as string[],
};

describe("diagnóstico da conexão", () => {
  it("descreve o token conforme o provedor", () => {
    expect(tokenLine(test, false)).toBe("Token aceito");
    expect(tokenLine({ ...test, tokenOk: false }, false)).toBe(
      "Token recusado ou ilegível",
    );
    expect(tokenLine(test, true)).toBe("Chave da Zernio aceita");
    expect(tokenLine({ ...test, tokenOk: false }, true)).toBe(
      "Chave da Zernio recusada ou ausente",
    );
  });

  it("descreve os webhooks conforme o provedor e os campos que faltam", () => {
    expect(subscriptionLine(test, false)).toBe(
      "Webhooks: todos os campos exigidos estão assinados",
    );
    expect(subscriptionLine(test, true)).toBe("Webhook: segredo configurado");
    expect(
      subscriptionLine({ ...test, subscriptionChecked: false }, false),
    ).toBe("Webhooks: não foi possível conferir");
    expect(
      subscriptionLine(
        { ...test, missingFields: ["comments", "messages"] },
        false,
      ),
    ).toBe("Webhooks: faltam comments, messages");
  });
});

describe("avisos da conexão", () => {
  it("não mostra nada sem operação", () => {
    expect(
      buildConnectionNotices({
        ok: false,
        webhookRequested: false,
        disconnected: false,
        tested: false,
      }),
    ).toEqual([]);
  });

  it("monta os avisos na ordem da tela", () => {
    const notices = buildConnectionNotices({
      ok: true,
      accountName: "jotasx",
      webhookRequested: true,
      errorCode: "state",
      disconnected: true,
      tested: true,
    });

    expect(notices.map((notice) => notice.id)).toEqual([
      "ok",
      "disconnected",
      "error",
      "webhook",
      "tested",
    ]);
    expect(notices[0]?.description).toBe(
      "@jotasx já pode disparar automações.",
    );
    expect(notices[2]?.description).toBe(
      "A sessão de login expirou. Tente conectar novamente.",
    );
  });

  it("usa a mensagem genérica para código desconhecido", () => {
    const notices = buildConnectionNotices({
      ok: false,
      webhookRequested: false,
      disconnected: false,
      tested: false,
      errorCode: "desconhecido",
    });
    expect(notices[0]?.description).toBe(
      "Não foi possível concluir a operação.",
    );
  });
});
