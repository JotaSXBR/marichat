import { afterEach, describe, expect, it, vi } from "vitest";

import { getSubscribedApps } from "@/lib/instagram/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cliente do Instagram: inscrições de webhook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("une os campos assinados por todos os apps da conta", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/subscribed_apps");
      return jsonResponse({
        data: [
          {
            id: "1",
            name: "App A",
            subscribed_fields: ["comments", "messages"],
          },
          {
            id: "2",
            name: "App B",
            subscribed_fields: ["messaging_postbacks"],
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const apps = await getSubscribedApps({
      igUserId: "17841400000000000",
      accessToken: "token",
    });

    expect(apps).toEqual([
      {
        id: "1",
        name: "App A",
        subscribedFields: ["comments", "messages"],
      },
      {
        id: "2",
        name: "App B",
        subscribedFields: ["messaging_postbacks"],
      },
    ]);

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/17841400000000000/subscribed_apps");
    expect(url).toContain("access_token=token");
  });

  it("sobrevive a itens sem subscribed_fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ data: [{ id: "1" }, null, "texto", { id: "2" }] }),
      ),
    );

    const apps = await getSubscribedApps({
      igUserId: "1784",
      accessToken: "token",
    });

    expect(apps).toEqual([
      { id: "1", name: undefined, subscribedFields: [] },
      { id: "2", name: undefined, subscribedFields: [] },
    ]);
  });

  it("devolve lista vazia quando a resposta não tem data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: true })),
    );

    await expect(
      getSubscribedApps({ igUserId: "1784", accessToken: "token" }),
    ).resolves.toEqual([]);
  });
});
