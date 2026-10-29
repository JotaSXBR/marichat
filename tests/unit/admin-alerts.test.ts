import { describe, expect, it } from "vitest";

import { buildActivityAlerts } from "@/app/admin/atividade/alerts";
import { buildDashboardAlerts } from "@/app/admin/dashboard-alerts";

describe("avisos da Visão geral", () => {
  it("não mostra nada com a conta saudável e o token longe de expirar", () => {
    expect(
      buildDashboardAlerts({
        account: { connectionStatus: "connected" },
        webhookError: null,
        tokenDaysLeft: 40,
      }),
    ).toEqual([]);
  });

  it("pede reconexão quando a conta existe mas não está conectada", () => {
    const alerts = buildDashboardAlerts({
      account: { connectionStatus: "reconnect_required" },
      webhookError: null,
      tokenDaysLeft: null,
    });
    expect(alerts.map((alert) => alert.id)).toEqual(["connection"]);
  });

  it("ordena por urgência e mostra no máximo dois", () => {
    const alerts = buildDashboardAlerts({
      account: null,
      webhookError: "falhou",
      tokenDaysLeft: 3,
    });
    expect(alerts.map((alert) => alert.id)).toEqual(["no-account", "webhook"]);
  });

  it("avisa sobre o token a partir de dez dias", () => {
    const alerts = buildDashboardAlerts({
      account: { connectionStatus: "connected" },
      webhookError: null,
      tokenDaysLeft: 10,
    });
    expect(alerts[0]?.title).toBe("O token expira em 10 dia(s)");
  });
});

describe("avisos da Atividade", () => {
  const tickDate = new Date("2026-10-28T12:00:00Z");

  it("não mostra nada quando a operação está saudável", () => {
    expect(
      buildActivityAlerts({
        account: {},
        tickDate,
        tickStale: false,
        webhookError: null,
      }),
    ).toEqual([]);
  });

  it("mostra conta, parada da fila e webhook, limitado a dois", () => {
    const alerts = buildActivityAlerts({
      account: null,
      tickDate,
      tickStale: true,
      webhookError: "falhou",
    });

    expect(alerts.map((alert) => alert.id)).toEqual(["account", "tick"]);
    expect(alerts[1]?.description).toContain("28/10/2026");
  });
});
