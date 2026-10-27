import { formatDateTime } from "@/app/admin/conexao/connection-utils";

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
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-medium">Últimos webhooks recebidos</h2>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-600">
          Nenhum evento recebido ainda. Publique um comentário de teste para
          conferir.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 text-sm">
          {events.map((event) => (
            <li
              key={event.eventKey}
              className="flex flex-wrap justify-between gap-2 px-4 py-2"
            >
              <span className="font-mono text-xs">{event.eventKey}</span>
              <span className="text-xs text-zinc-500">
                {event.status} · {formatDateTime(event.receivedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
