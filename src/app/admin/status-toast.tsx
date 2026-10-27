"use client";

import { useState } from "react";

import {
  StatusIsland,
  type IslandTask,
} from "@/components/kokonutui/status-island";

/**
 * R6 — ilha de status: aparece uma vez e sai sozinha em 8 s.
 * O mesmo estado está escrito na página, então nada se perde quando some.
 */
export function StatusToast({ task }: { task: IslandTask }) {
  const [tasks, setTasks] = useState<IslandTask[]>([task]);
  if (tasks.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto">
        <StatusIsland
          dismissAfter={8000}
          onDismiss={(id) =>
            setTasks((current) => current.filter((item) => item.id !== id))
          }
          tasks={tasks}
        />
      </div>
    </div>
  );
}
