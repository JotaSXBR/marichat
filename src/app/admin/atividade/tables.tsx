import type { ReactNode } from "react";

import type { ActivityData, ActivityFilter } from "@/app/admin/atividade/data";
import {
  formatDateTime,
  handleOf,
  interactionLabels,
  interactionTones,
  jobKindLabels,
  jobStatusLabels,
  jobTones,
  short,
  webhookStatusLabels,
  webhookTones,
  type ChipTone,
} from "@/app/admin/labels";
import { SectionHeading } from "@/components/marichat/page-header";
import { LoadMore } from "@/components/marichat/load-more";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Interaction = ActivityData["interactions"][number];
type Job = ActivityData["jobs"][number];
type Event = ActivityData["events"][number];

function Shell({
  title,
  description,
  count,
  total,
  moreHref,
  children,
}: {
  title: string;
  description: string;
  count: number;
  total: number;
  moreHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-6">
      <SectionHeading
        meta={`${total} ${total === 1 ? "registro" : "registros"}`}
        title={title}
      />
      <p className="mt-2 max-w-[70ch] text-[0.8125rem] leading-5 text-muted-soft">
        {description}
      </p>
      {children}
      <LoadMore href={moreHref} shown={count} total={total} />
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-line-subtle py-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
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

/** Duas linhas de dado pequeno: quem, e quando. */
function Meta({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-0.5 flex items-baseline justify-between gap-3">
      <span className="truncate font-mono text-[0.75rem] text-muted-soft">
        {left}
      </span>
      <span className="font-mono text-[0.75rem] text-muted-soft">{right}</span>
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-1 line-clamp-2 text-[0.75rem] leading-[1.125rem] text-danger">
      {short(message, 120)}
    </p>
  );
}

type Column<T> = { head: string; cell: (row: T) => ReactNode };

/** Tabela no desktop, registro de duas linhas no mobile (§4). */
function Records<T>({
  rows,
  columns,
  mobile,
  keyOf,
}: {
  rows: T[];
  columns: Column<T>[];
  mobile: (row: T) => ReactNode;
  keyOf: (row: T) => string;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table className="[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.head}>{column.head}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={keyOf(row)}>
                {columns.map((column) => (
                  <TableCell key={column.head}>{column.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="md:hidden">
        {rows.map((row) => (
          <li className="border-b border-line-subtle py-3" key={keyOf(row)}>
            {mobile(row)}
          </li>
        ))}
      </ul>
    </>
  );
}

const MONO_CELL = "font-mono text-[0.75rem] text-muted-foreground";
const ERROR_CELL =
  "block max-w-[320px] font-mono text-[0.75rem] text-muted-soft";

const interactionColumns: Column<Interaction>[] = [
  {
    head: "Quando",
    cell: (row) => (
      <span className={MONO_CELL}>{formatDateTime(row.createdAt)}</span>
    ),
  },
  {
    head: "Automação",
    cell: (row) => (
      <span className="font-medium text-foreground">
        {row.automationName ?? "—"}
      </span>
    ),
  },
  {
    head: "Comentário",
    cell: (row) => (
      <span className="block max-w-[360px]">
        <span className="block truncate">{short(row.commentText)}</span>
        <span className="block font-mono text-[0.75rem] text-muted-soft">
          {handleOf(row)}
        </span>
      </span>
    ),
  },
  {
    head: "Situação",
    cell: (row) => (
      <Chip
        labels={interactionLabels}
        status={row.state}
        tones={interactionTones}
      />
    ),
  },
];

function InteractionRecord({ row }: { row: Interaction }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {row.automationName ?? "—"}
        </span>
        <Chip
          labels={interactionLabels}
          status={row.state}
          tones={interactionTones}
        />
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {short(row.commentText, 120)}
      </p>
      <Meta left={handleOf(row)} right={formatDateTime(row.createdAt)} />
    </>
  );
}

export function InteractionsSection({
  rows,
  total,
  situation,
  moreHref,
}: {
  rows: Interaction[];
  total: number;
  situation?: ActivityFilter;
  moreHref?: string;
}) {
  return (
    <Shell
      count={rows.length}
      description="Comentários recebidos e o que aconteceu com cada um."
      moreHref={moreHref}
      title="Interações"
      total={total}
    >
      {rows.length === 0 ? (
        <Empty>
          {situation
            ? "Nenhuma interação com essa situação."
            : "Nenhum comentário recebido ainda."}
        </Empty>
      ) : (
        <Records
          columns={interactionColumns}
          keyOf={(row) => row.id}
          mobile={(row) => <InteractionRecord row={row} />}
          rows={rows}
        />
      )}
    </Shell>
  );
}

const jobColumns: Column<Job>[] = [
  {
    head: "Atualizado",
    cell: (row) => (
      <span className={MONO_CELL}>{formatDateTime(row.updatedAt)}</span>
    ),
  },
  {
    head: "Tipo",
    cell: (row) => (
      <span className="font-medium text-foreground">
        {jobKindLabels[row.kind] ?? row.kind}
      </span>
    ),
  },
  {
    head: "Quem",
    cell: (row) => <span className={MONO_CELL}>{handleOf(row)}</span>,
  },
  {
    head: "Situação",
    cell: (row) => (
      <Chip labels={jobStatusLabels} status={row.status} tones={jobTones} />
    ),
  },
  {
    head: "Erro",
    cell: (row) => (
      <span className={ERROR_CELL}>
        {row.errorMessage ? short(row.errorMessage, 120) : "—"}
      </span>
    ),
  },
];

function JobRecord({ row }: { row: Job }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {jobKindLabels[row.kind] ?? row.kind}
        </span>
        <Chip labels={jobStatusLabels} status={row.status} tones={jobTones} />
      </div>
      <Meta left={handleOf(row)} right={formatDateTime(row.updatedAt)} />
      <ErrorLine message={row.errorMessage} />
    </>
  );
}

export function JobsSection({
  rows,
  total,
  moreHref,
}: {
  rows: Job[];
  total: number;
  moreHref?: string;
}) {
  return (
    <Shell
      count={rows.length}
      description="Cada DM e cada checagem de seguidor, com o erro quando existe."
      moreHref={moreHref}
      title="Envios e tarefas da fila"
      total={total}
    >
      {rows.length === 0 ? (
        <Empty>Nenhuma tarefa criada ainda.</Empty>
      ) : (
        <Records
          columns={jobColumns}
          keyOf={(row) => row.id}
          mobile={(row) => <JobRecord row={row} />}
          rows={rows}
        />
      )}
    </Shell>
  );
}

const eventColumns: Column<Event>[] = [
  {
    head: "Quando",
    cell: (row) => (
      <span className={MONO_CELL}>{formatDateTime(row.receivedAt)}</span>
    ),
  },
  {
    head: "Campo",
    cell: (row) => (
      <span className="font-mono text-[0.75rem] text-foreground">
        {row.field}
      </span>
    ),
  },
  {
    head: "Situação",
    cell: (row) => (
      <Chip
        labels={webhookStatusLabels}
        status={row.status}
        tones={webhookTones}
      />
    ),
  },
  {
    head: "Erro",
    cell: (row) => (
      <span className={ERROR_CELL}>
        {row.errorMessage ? short(row.errorMessage, 120) : "—"}
      </span>
    ),
  },
];

function EventRecord({ row }: { row: Event }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[0.8125rem] text-foreground">
          {row.field}
        </span>
        <Chip
          labels={webhookStatusLabels}
          status={row.status}
          tones={webhookTones}
        />
      </div>
      <Meta left={row.eventKey} right={formatDateTime(row.receivedAt)} />
      <ErrorLine message={row.errorMessage} />
    </>
  );
}

export function EventsSection({
  rows,
  total,
  moreHref,
}: {
  rows: Event[];
  total: number;
  moreHref?: string;
}) {
  return (
    <Shell
      count={rows.length}
      description="O que chegou da Meta antes de virar interação."
      moreHref={moreHref}
      title="Webhooks recebidos"
      total={total}
    >
      {rows.length === 0 ? (
        <Empty>Nenhum evento recebido ainda.</Empty>
      ) : (
        <Records
          columns={eventColumns}
          keyOf={(row) => row.eventKey}
          mobile={(row) => <EventRecord row={row} />}
          rows={rows}
        />
      )}
    </Shell>
  );
}
