/** Avisos da Visão geral (sem JSX), do mais para o menos urgente. */

export type DashboardAlert = {
  id: string;
  /** 0 é o mais urgente. */
  priority: number;
  variant: "danger" | "warning" | "info";
  icon: "plug" | "shield" | "alert" | "key";
  title: string;
  description: string;
  href: string;
  action: string;
};

/**
 * Alertas da Visão geral, do mais para o menos urgente.
 * A tela mostra no máximo 2 (§9.1): o resto vive na página Conexão.
 */
function tokenAlert(tokenDaysLeft: number | null): DashboardAlert[] {
  if (tokenDaysLeft === null || tokenDaysLeft > 10) return [];
  return [
    {
      id: "token",
      priority: 2,
      variant: "warning",
      icon: "key",
      title: `O token expira em ${tokenDaysLeft} dia(s)`,
      description:
        "A renovação automática roda a cada minuto. Se falhar, reconecte.",
      href: "/admin/conexao",
      action: "Conexão",
    },
  ];
}

export function buildDashboardAlerts({
  account,
  webhookError,
  tokenDaysLeft,
}: {
  account: { connectionStatus: string } | null;
  webhookError: string | null;
  tokenDaysLeft: number | null;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (!account) {
    alerts.push({
      id: "no-account",
      priority: 0,
      variant: "warning",
      icon: "plug",
      title: "Nenhuma conta conectada",
      description: "Conecte o Instagram para começar a receber comentários.",
      href: "/admin/conexao",
      action: "Conectar",
    });
  }

  if (account && account.connectionStatus !== "connected") {
    alerts.push({
      id: "connection",
      priority: 0,
      variant: "danger",
      icon: "shield",
      title: "A conexão precisa ser refeita",
      description:
        "Os envios ficam parados até reconectar o perfil do Instagram.",
      href: "/admin/conexao",
      action: "Ir para Conexão",
    });
  }

  if (webhookError) {
    alerts.push({
      id: "webhook",
      priority: 1,
      variant: "danger",
      icon: "alert",
      title: "A inscrição dos webhooks falhou",
      description: "A última tentativa de registro falhou.",
      href: "/admin/conexao",
      action: "Ver detalhes",
    });
  }

  alerts.push(...tokenAlert(tokenDaysLeft));

  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 2);
}
