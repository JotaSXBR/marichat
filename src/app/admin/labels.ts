/**
 * Rótulos em português para os estados guardados no banco.
 * Ficam fora das páginas para a visão geral e a atividade usarem o mesmo texto.
 */

export const interactionLabels: Record<string, string> = {
  queued: "Na fila",
  accepted: "DM enviada (aceita)",
  gate_pending: "Aguardando confirmação de seguidor",
  link_sent: "Link enviado",
  uncertain: "Incerta",
  expired: "Expirada",
  failed: "Falhou",
  canceled: "Cancelada",
};

export const jobStatusLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  accepted: "Aceita pela Meta",
  failed: "Falhou",
  uncertain: "Incerta",
  expired: "Expirada",
  canceled: "Cancelada",
};

export const jobKindLabels: Record<string, string> = {
  private_reply: "DM 1 — resposta privada",
  followup_link: "Link após checagem",
  link_optional: "Link + botão seguir",
  link_direct: "Link direto",
  follow_gate: "Porta de seguidor",
  follow_check: "Checagem de seguidor (1)",
  follow_check_2: "Checagem de seguidor (2)",
};

export const webhookStatusLabels: Record<string, string> = {
  received: "Recebido",
  processed: "Processado",
  ignored: "Ignorado",
  failed: "Falhou",
};

export function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}
