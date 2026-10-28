import { IG } from "@/lib/instagram/config";
import type { InteractionRow, JobRow } from "@/lib/queue/types";

/** Prazo da Meta para a tarefa, em milissegundos (null = sem prazo). */
export function deadlineFor(
  job: JobRow,
  interaction: InteractionRow,
): number | null {
  if (job.kind === "private_reply" || job.kind === "public_reply") {
    return interaction.replyDeadlineAt.getTime();
  }
  if (!interaction.userLastMessageAt) return null;
  return interaction.userLastMessageAt.getTime() + IG.messagingWindowMs;
}
