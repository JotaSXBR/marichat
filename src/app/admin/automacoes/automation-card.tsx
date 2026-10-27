import Link from "next/link";

import { toggleAutomation } from "@/app/admin/actions";
import type { automations } from "@/lib/db/schema";
import { FOLLOW_MODE_LABELS, isFollowMode } from "@/lib/follow-mode";

type Automation = typeof automations.$inferSelect;

function AutomationDetails({ automation }: { automation: Automation }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">{automation.name}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            automation.isActive
              ? "bg-green-100 text-green-800"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {automation.isActive ? "Ativa" : "Desativada"}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Palavra-chave: <strong>{automation.keyword}</strong>
      </p>
      <p className="text-sm text-zinc-500">
        Publicação:{" "}
        {automation.mediaId
          ? `específica (${automation.mediaId})`
          : "qualquer publicação"}
      </p>
      <p className="text-sm text-zinc-500">
        Porta de seguidor:{" "}
        {isFollowMode(automation.followMode)
          ? FOLLOW_MODE_LABELS[automation.followMode].title
          : "Sem porta de seguidor"}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-500">
        Link: {automation.linkUrl}
      </p>
    </div>
  );
}

function AutomationActions({ automation }: { automation: Automation }) {
  return (
    <div className="flex items-center gap-2">
      <form action={toggleAutomation}>
        <input type="hidden" name="id" value={automation.id} />
        <input
          type="hidden"
          name="activate"
          value={automation.isActive ? "0" : "1"}
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          {automation.isActive ? "Desativar" : "Ativar"}
        </button>
      </form>
      <Link
        href={`/admin/automacoes/${automation.id}`}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
      >
        Editar
      </Link>
    </div>
  );
}

export function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AutomationDetails automation={automation} />
        <AutomationActions automation={automation} />
      </div>
    </li>
  );
}
