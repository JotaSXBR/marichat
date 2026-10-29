/** Avisos da Atividade (sem JSX): até dois, do mais grave para o menos. */

import { formatDateTime } from "@/app/admin/labels";

export type ActivityAlert = {
  id: string;
  variant: "warning" | "danger";
  icon: "plug" | "clock" | "shield";
  title: string;
  description: string;
  href?: string;
  action?: string;
};

export function buildActivityAlerts({
  account,
  tickDate,
  tickStale,
  webhookError,
}: {
  account: object | null;
  tickDate: Date | null;
  tickStale: boolean;
  webhookError: string | null;
}): ActivityAlert[] {
  const alerts: ActivityAlert[] = [];

  if (!account) {
    alerts.push({
      id: "account",
      variant: "warning",
      icon: "plug",
      title: "Nenhuma conta conectada",
      description: "Conecte o Instagram para começar a receber comentários.",
      href: "/admin/conexao",
      action: "Conectar agora",
    });
  }

  if (tickStale) {
    alerts.push({
      id: "tick",
      variant: "danger",
      icon: "clock",
      title: "A tarefa agendada parou",
      description: `A fila não anda desde ${formatDateTime(tickDate)}. Confira o cron em /api/cron/tick.`,
    });
  }

  if (webhookError) {
    alerts.push({
      id: "webhook",
      variant: "danger",
      icon: "shield",
      title: "A inscrição dos webhooks falhou",
      description: webhookError,
      href: "/admin/conexao",
      action: "Ver Conexão",
    });
  }

  // §4: no máximo 2 alertas empilhados.
  return alerts.slice(0, 2);
}
