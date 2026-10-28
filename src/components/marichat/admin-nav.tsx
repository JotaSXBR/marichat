"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ActivityIcon,
  LayoutDashboard,
  Link2,
  Plug,
  ShieldCheck,
  Trash2,
  User2,
  Workflow,
} from "lucide-react";

import { CommandPalette } from "@/components/marichat/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/automacoes", label: "Automações", icon: Workflow },
  { href: "/admin/atividade", label: "Atividade", icon: ActivityIcon },
  { href: "/admin/conexao", label: "Conexão", icon: Plug },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(handle: string | null) {
  if (!handle) return "MC";
  return handle.slice(0, 2).toUpperCase();
}

/**
 * R1 — uma navegação só. Desktop: pílula de vidro no topo. Mobile: barra
 * plana no topo + 4 abas fixas no polegar (§3, §4).
 */
export function AdminNav({
  handle,
  connected,
}: {
  handle: string | null;
  connected: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 md:px-4 md:pt-6">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:h-16 md:gap-3 md:rounded-xl md:border md:bg-card md:px-4">
          <Link
            className="flex h-12 shrink-0 items-center font-heading text-title tracking-[-0.02em] text-foreground md:h-auto"
            href="/admin"
          >
            MARICHAT
          </Link>

          <DesktopNav pathname={pathname} />

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <ConnectionChip connected={connected} handle={handle} />

            <CommandPalette className="hidden w-64 xl:block" />

            <AccountMenu handle={handle} />
          </div>
        </div>
      </header>

      <MobileTabBar pathname={pathname} />
    </>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Seções do painel"
      className="ml-2 hidden items-center gap-1 md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-label transition-colors duration-150 ease-out",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Seções do painel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-label transition-colors duration-150 ease-out",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                href={item.href}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  />
                ) : null}
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ConnectionChip({
  handle,
  connected,
}: {
  handle: string | null;
  connected: boolean;
}) {
  return (
    <Link
      className="flex h-12 items-center md:h-auto"
      href="/admin/conexao"
      title={
        handle
          ? `Conta @${handle} · ${connected ? "conectada" : "precisa de atenção"}`
          : "Nenhuma conta conectada"
      }
    >
      <StatusChip
        className="max-md:gap-1 max-md:px-2 max-md:tracking-normal"
        tone={connected ? "success" : handle ? "warning" : "neutral"}
      >
        <span className="truncate">
          {handle ? (
            <>
              <span className="md:hidden">
                {connected ? "Conectado" : "Atenção"}
              </span>
              <span className="hidden md:inline">@{handle}</span>
            </>
          ) : (
            "Sem conta"
          )}
        </span>
      </StatusChip>
    </Link>
  );
}

function AccountMenu({ handle }: { handle: string | null }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Menu da conta · ${initials(handle)}`}
          className="flex size-12 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:size-8"
          type="button"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-micro">
              {initials(handle)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-micro text-muted-foreground uppercase">
            Conta conectada
          </span>
          <span className="mt-1 block font-mono text-mono text-foreground normal-case">
            {handle ? `@${handle}` : "Nenhuma conta"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/admin/conexao")}>
          <Link2 aria-hidden />
          Conexão
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/privacidade")}>
          <ShieldCheck aria-hidden />
          Política de privacidade
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/exclusao-de-dados")}>
          <Trash2 aria-hidden />
          Exclusão de dados
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User2 aria-hidden />
          Login pelo navegador
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
