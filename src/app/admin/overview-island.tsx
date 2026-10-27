import { StatusToast } from "@/app/admin/status-toast";

/**
 * R6 — ilha de status da Visão geral (§9.1).
 * Mostra conta, conexão e fila por 8 s e sai sozinha; o mesmo estado está
 * escrito nos painéis da página, então nada se perde quando ela desaparece.
 */
export function OverviewIsland({
  handle,
  connected,
  queuedJobs,
}: {
  handle: string;
  connected: boolean;
  queuedJobs: number;
}) {
  const detail = connected
    ? queuedJobs === 0
      ? "Conectado · Fila saudável"
      : `Conectado · ${queuedJobs} na fila`
    : "Desconectado · envios parados";

  return (
    <StatusToast
      task={{ id: "overview", label: `@${handle}`, detail, status: "done" }}
    />
  );
}
