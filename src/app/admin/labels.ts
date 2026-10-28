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
  public_reply: "Resposta no comentário",
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

export type ChipTone =
  "success" | "warning" | "danger" | "info" | "neutral" | "loading";

/** Tom do chip por estado — sempre acompanhado de texto (§2.7). */
export const interactionTones: Record<string, ChipTone> = {
  queued: "neutral",
  accepted: "info",
  gate_pending: "warning",
  link_sent: "success",
  uncertain: "warning",
  expired: "danger",
  failed: "danger",
  canceled: "neutral",
};

export const webhookTones: Record<string, ChipTone> = {
  received: "info",
  processed: "success",
  ignored: "neutral",
  failed: "danger",
};

/** Situação da conta conectada, com texto e tom. */
export const connectionLabels: Record<
  string,
  { label: string; tone: ChipTone }
> = {
  connected: { label: "Conectada", tone: "success" },
  reconnect_required: { label: "Reconectar", tone: "warning" },
  revoked: { label: "Revogada", tone: "danger" },
};

export const jobTones: Record<string, ChipTone> = {
  pending: "neutral",
  processing: "loading",
  accepted: "success",
  failed: "danger",
  uncertain: "warning",
  expired: "danger",
  canceled: "neutral",
};

export function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}
