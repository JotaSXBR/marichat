import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import { webhookStatusLabels, webhookTones } from "@/app/admin/labels";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WebhookEventRow = {
  eventKey: string;
  status: string;
  receivedAt: Date;
};

type Props = {
  events: WebhookEventRow[];
};

/** Últimos eventos gravados pelo webhook (prova de que ele chega). */
export function RecentWebhooks({ events }: Props) {
  return (
    <section className="py-4">
      <h2 className="text-[0.875rem] font-semibold text-foreground">
        Últimos webhooks recebidos
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-5 text-muted-soft">
        A prova de que a Meta (ou a Zernio) está entregando os eventos.
      </p>

      {events.length === 0 ? (
        <p className="border-b border-line-subtle py-3 text-sm text-muted-foreground">
          Nenhum evento recebido ainda. Publique um comentário de teste para
          conferir.
        </p>
      ) : (
        <Table className="mt-1">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-0">Quando</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead className="pr-0">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.eventKey}>
                <TableCell className="pl-0 font-mono text-[0.75rem] text-muted-foreground">
                  {formatDateTime(event.receivedAt)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate font-mono text-[0.75rem]">
                  {event.eventKey}
                </TableCell>
                <TableCell className="pr-0">
                  <StatusChip tone={webhookTones[event.status] ?? "neutral"}>
                    {webhookStatusLabels[event.status] ?? event.status}
                  </StatusChip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
