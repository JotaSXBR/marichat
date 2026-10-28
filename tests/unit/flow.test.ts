import { describe, expect, it } from "vitest";

import { interactionFlow } from "@/app/admin/flow";

describe("fluxo da visão geral", () => {
  it("conta comentários, DMs aceitas e links enviados sem duplicar", () => {
    expect(
      interactionFlow([
        { state: "accepted", total: 2 },
        { state: "gate_pending", total: "1" },
        { state: "link_sent", total: 4 },
        { state: "failed", total: 3 },
      ]),
    ).toEqual({
      totalInteractions: 10,
      acceptedDms: 7,
      linksSent: 4,
    });
  });

  it("devolve zero quando ainda não há interação", () => {
    expect(interactionFlow([])).toEqual({
      totalInteractions: 0,
      acceptedDms: 0,
      linksSent: 0,
    });
  });
});
