import type { ReactNode } from "react";

import type { ActivityData, ActivityFilter } from "@/app/admin/atividade/data";
import {
  formatDateTime,
  interactionLabels,
  interactionTones,
  jobKindLabels,
  jobStatusLabels,
  jobTones,
  webhookStatusLabels,
  webhookTones,
  type ChipTone,
} from "@/app/admin/labels";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function short(value: string | null, max = 80): string {
  if (!value) return "—";
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function Shell({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5">
      <div className="pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-section text-foreground">{title}</h2>
          <span className="font-mono text-micro text-muted-foreground">
            {count} {count === 1 ? "registro" : "registros"}
          </span>
        </div>
        <p className="mt-1 text-label text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-body text-muted-foreground">{children}</p>;
}

function Chip({
  labels,
  tones,
  status,
}: {
  labels: Record<string, string>;
  tones: Record<string, ChipTone>;
  status: string;
}) {
  return (
    <StatusChip tone={tones[status] ?? "neutral"}>
      {labels[status] ?? status}
    </StatusChip>
  );
}

function InteractionRow({
  row,
}: {
  row: ActivityData["interactions"][number];
}) {
  return (
    <TableRow>
      <TableCell
        className="font-mono text-mono text-muted-foreground"
        data-label="Quando"
      >
        {formatDateTime(row.createdAt)}
      </TableCell>
      <TableCell data-label="Automação">{row.automationName ?? "—"}</TableCell>
      <TableCell
        className="max-w-[320px] whitespace-normal"
        data-label="Comentário"
      >
        {short(row.commentText)}
        <span className="mt-0.5 block text-label text-muted-foreground">
          {row.commenterUsername
            ? `@${row.commenterUsername}`
            : "Autor não identificado"}
        </span>
      </TableCell>
      <TableCell data-label="Situação">
        <Chip
          labels={interactionLabels}
          status={row.state}
          tones={interactionTones}
        />
      </TableCell>
    </TableRow>
  );
}

export function InteractionsSection({
  rows,
  situation,
}: {
  rows: ActivityData["interactions"];
  situation?: ActivityFilter;
}) {
  return (
    <Shell
      count={rows.length}
      description="Comentários recebidos e o que aconteceu com cada um."
      title="Interações"
    >
      {rows.length === 0 ? (
        <Empty>
          {situation
            ? "Nenhuma interação com essa situação."
            : "Nenhum comentário recebido ainda."}
        </Empty>
      ) : (
        <Table className="table-stack">
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Automação</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <InteractionRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      )}
    </Shell>
  );
}

function JobRow({ row }: { row: ActivityData["jobs"][number] }) {
  return (
    <TableRow>
      <TableCell
        className="font-mono text-mono text-muted-foreground"
        data-label="Atualizado"
      >
        {formatDateTime(row.updatedAt)}
      </TableCell>
      <TableCell data-label="Tipo">
        {jobKindLabels[row.kind] ?? row.kind}
      </TableCell>
      <TableCell
        className="font-mono text-mono text-muted-foreground"
        data-label="Quem"
      >
        {row.commenterUsername
          ? `@${row.commenterUsername}`
          : (row.commenter ?? "—")}
      </TableCell>
      <TableCell data-label="Situação">
        <Chip labels={jobStatusLabels} status={row.status} tones={jobTones} />
      </TableCell>
      <TableCell
        className="max-w-[320px] whitespace-normal text-label"
        data-label="Erro"
      >
        {row.errorMessage ? short(row.errorMessage, 120) : "—"}
      </TableCell>
    </TableRow>
  );
}

export function JobsSection({ rows }: { rows: ActivityData["jobs"] }) {
  return (
    <Shell
      count={rows.length}
      description="Cada DM e cada checagem de seguidor, com o erro quando existe."
      title="Envios e tarefas da fila"
    >
      {rows.length === 0 ? (
        <Empty>Nenhuma tarefa criada ainda.</Empty>
      ) : (
        <Table className="table-stack">
          <TableHeader>
            <TableRow>
              <TableHead>Atualizado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <JobRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      )}
    </Shell>
  );
}

export function EventsSection({ rows }: { rows: ActivityData["events"] }) {
  return (
    <Shell
      count={rows.length}
      description="O que chegou da Meta antes de virar interação."
      title="Webhooks recebidos"
    >
      {rows.length === 0 ? (
        <Empty>Nenhum evento recebido ainda.</Empty>
      ) : (
        <Table className="table-stack">
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.eventKey}>
                <TableCell
                  className="font-mono text-mono text-muted-foreground"
                  data-label="Quando"
                >
                  {formatDateTime(row.receivedAt)}
                </TableCell>
                <TableCell data-label="Campo">{row.field}</TableCell>
                <TableCell data-label="Situação">
                  <Chip
                    labels={webhookStatusLabels}
                    status={row.status}
                    tones={webhookTones}
                  />
                </TableCell>
                <TableCell
                  className="max-w-[320px] whitespace-normal text-label"
                  data-label="Erro"
                >
                  {row.errorMessage ? short(row.errorMessage, 120) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Shell>
  );
}
