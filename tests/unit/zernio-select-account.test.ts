import { describe, expect, it } from "vitest";

import { chooseZernioAccount } from "@/lib/zernio/select-account";

function account(id: string) {
  return {
    id,
    username: `conta_${id}`,
    platformUserId: null,
    instagramScopedId: null,
    isActive: true,
    needsReconnection: false,
  };
}

describe("chooseZernioAccount", () => {
  it("usa a conta pedida no formulário", () => {
    const chosen = chooseZernioAccount([account("a"), account("b")], "b");

    expect(chosen?.id).toBe("b");
  });

  it("recusa id que não existe na lista", () => {
    expect(chooseZernioAccount([account("a")], "z")).toBeNull();
  });

  it("escolhe sozinho quando existe uma única conta", () => {
    expect(chooseZernioAccount([account("a")], "")?.id).toBe("a");
  });

  it("não escolhe sozinho quando existe mais de uma conta", () => {
    expect(chooseZernioAccount([account("a"), account("b")], "")).toBeNull();
  });

  it("devolve nulo quando a lista está vazia", () => {
    expect(chooseZernioAccount([], "")).toBeNull();
  });
});
