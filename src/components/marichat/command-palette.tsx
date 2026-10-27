"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
  Workflow,
} from "lucide-react";

import ActionSearchBar, {
  type CommandItem,
} from "@/components/kokonutui/action-search-bar";

/**
 * Comandos do painel (Ctrl K) sobre o `action-search-bar` do Kokonut.
 * A lista é fechada: só rotas e ações que existem de verdade.
 */
const ICON = "size-4";

const ITEMS: CommandItem[] = [
  {
    id: "overview",
    label: "Visão geral",
    icon: <LayoutDashboard className={ICON} />,
    group: "Ir para",
    keywords: ["painel", "início", "dashboard"],
    href: "/admin",
  },
  {
    id: "automations",
    label: "Automações",
    icon: <Workflow className={ICON} />,
    group: "Ir para",
    keywords: ["fluxos", "regras"],
    href: "/admin/automacoes",
  },
  {
    id: "activity",
    label: "Atividade",
    icon: <Activity className={ICON} />,
    group: "Ir para",
    keywords: ["interações", "fila", "webhooks"],
    href: "/admin/atividade",
  },
  {
    id: "connection",
    label: "Conexão",
    icon: <Link2 className={ICON} />,
    group: "Ir para",
    keywords: ["instagram", "token", "conta"],
    href: "/admin/conexao",
  },
  {
    id: "new-automation",
    label: "Nova automação",
    icon: <Plus className={ICON} />,
    group: "Ações",
    keywords: ["criar", "nova"],
    href: "/admin/automacoes/nova",
  },
  {
    id: "refresh",
    label: "Atualizar dados",
    icon: <RefreshCw className={ICON} />,
    group: "Ações",
    keywords: ["recarregar", "sincronizar"],
  },
];

export function CommandPalette({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <ActionSearchBar
      className={className}
      defaultRecent={[]}
      items={ITEMS}
      label="Buscar comandos do painel"
      onSelect={(item) => {
        if (item.href) {
          router.push(item.href);
          return;
        }
        if (item.id === "refresh") {
          router.refresh();
        }
      }}
      placeholder="Buscar ou ir para…"
      shortcut
    />
  );
}
