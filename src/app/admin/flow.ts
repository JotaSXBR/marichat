/**
 * O fluxo da Visão geral em três etapas: comentário, DM aceita, link enviado.
 * Cada interação tem um estado só, então somar estados não duplica nada.
 */
export type InteractionStat = { state: string; total: number | string };

export function interactionFlow(rows: InteractionStat[]) {
  const byState = new Map(rows.map((row) => [row.state, Number(row.total)]));
  const linksSent = byState.get("link_sent") ?? 0;

  return {
    totalInteractions: [...byState.values()].reduce((sum, n) => sum + n, 0),
    acceptedDms:
      (byState.get("accepted") ?? 0) +
      (byState.get("gate_pending") ?? 0) +
      linksSent,
    linksSent,
  };
}
