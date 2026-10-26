import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  computeHubSignature256,
  parseSignedRequest,
  verifyHubSignature256,
} from "@/lib/signature";

const secret = "app-secret-de-teste";

describe("assinatura de webhook", () => {
  it("aceita a assinatura correta do corpo original", () => {
    const body = JSON.stringify({ object: "instagram", entry: [] });
    const signature = computeHubSignature256(body, secret);
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(verifyHubSignature256(body, signature, secret)).toBe(true);
  });

  it("rejeita quando o corpo muda", () => {
    const body = JSON.stringify({ object: "instagram" });
    const signature = computeHubSignature256(body, secret);
    expect(
      verifyHubSignature256(`${body} `, signature, secret),
    ).toBe(false);
  });

  it("rejeita segredo errado, cabeçalho vazio ou malformado", () => {
    const body = "{}";
    const signature = computeHubSignature256(body, secret);
    expect(verifyHubSignature256(body, signature, "outro")).toBe(false);
    expect(verifyHubSignature256(body, null, secret)).toBe(false);
    expect(verifyHubSignature256(body, "sha1=abc", secret)).toBe(false);
    expect(verifyHubSignature256(body, "sha256=abc", secret)).toBe(false);
  });
});

describe("signed_request da Meta", () => {
  function build(userId: string, signatureSecret = secret) {
    const payload = Buffer.from(
      JSON.stringify({ algorithm: "HMAC-SHA256", user_id: userId }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", signatureSecret)
      .update(payload)
      .digest("base64url");
    return `${signature}.${payload}`;
  }

  it("valida e devolve o payload", () => {
    const parsed = parseSignedRequest(build("12345"), secret);
    expect(parsed?.user_id).toBe("12345");
    expect(parsed?.algorithm).toBe("HMAC-SHA256");
  });

  it("rejeita assinatura inválida", () => {
    expect(parseSignedRequest(build("12345"), "outro")).toBeNull();
    expect(parseSignedRequest("sem-ponto", secret)).toBeNull();
    expect(parseSignedRequest("a.b.c", secret)).toBeNull();
  });
});
