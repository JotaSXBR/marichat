import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import { webhookStatusLabels, webhookTones } from "@/app/admin/labels";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="gap-4 p-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>Últimos webhooks recebidos</CardTitle>
        <CardDescription>
          A prova de que a Meta (ou a Zernio) está entregando os eventos.
        </CardDescription>
      </CardHeader>

      {events.length === 0 ? (
        <p className="px-5 pb-5 text-body text-muted-foreground">
          Nenhum evento recebido ainda. Publique um comentário de teste para
          conferir.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.eventKey}>
                <TableCell className="text-label text-muted-foreground">
                  {formatDateTime(event.receivedAt)}
                </TableCell>
                <TableCell className="font-mono text-mono">
                  {event.eventKey}
                </TableCell>
                <TableCell>
                  <StatusChip tone={webhookTones[event.status] ?? "neutral"}>
                    {webhookStatusLabels[event.status] ?? event.status}
                  </StatusChip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
