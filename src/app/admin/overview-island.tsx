"use client";

import { useState } from "react";

import {
  StatusIsland,
  type IslandTask,
} from "@/components/kokonutui/status-island";

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
  const [tasks, setTasks] = useState<IslandTask[]>([
    {
      id: "overview",
      label: `@${handle}`,
      detail: connected
        ? queuedJobs === 0
          ? "Conectado · Fila saudável"
          : `Conectado · ${queuedJobs} na fila`
        : "Desconectado · envios parados",
      status: "done",
    },
  ]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto">
        <StatusIsland
          dismissAfter={8000}
          onDismiss={(id) =>
            setTasks((current) => current.filter((task) => task.id !== id))
          }
          tasks={tasks}
        />
      </div>
    </div>
  );
}
