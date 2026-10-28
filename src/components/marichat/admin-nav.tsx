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
 * R1 — uma navegação só. Desktop: masthead de 64 px com régua e item ativo
 * sublinhado. Mobile: a mesma barra sem itens + 4 abas fixas (§3, §4).
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
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-5 px-4 md:gap-8">
          <Link
            className="flex h-12 shrink-0 items-center gap-2.5 font-heading text-title font-semibold tracking-[0.06em] text-foreground"
            href="/admin"
          >
            <span aria-hidden className="size-2.5 rounded-sm bg-primary" />
            MARICHAT
          </Link>

          <DesktopNav pathname={pathname} />

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <ConnectionStatus connected={connected} handle={handle} />

            <CommandPalette className="hidden w-56 lg:block" />

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
      className="hidden h-16 items-stretch gap-6 md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center text-label transition-colors duration-150 ease-out",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
              />
            ) : null}
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
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
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-micro font-medium tracking-normal transition-colors duration-150 ease-out",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                href={item.href}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 bg-primary"
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

function ConnectionStatus({
  handle,
  connected,
}: {
  handle: string | null;
  connected: boolean;
}) {
  return (
    <Link
      className="flex h-12 min-w-0 items-center gap-2 md:h-10"
      href="/admin/conexao"
      title={
        handle
          ? `Conta @${handle} · ${connected ? "conectada" : "precisa de atenção"}`
          : "Nenhuma conta conectada"
      }
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          connected ? "bg-success" : handle ? "bg-warning" : "bg-line-strong",
        )}
      />
      <span className="truncate text-label text-muted-foreground">
        <span className="md:hidden">
          {connected ? "Conectado" : handle ? "Atenção" : "Sem conta"}
        </span>
        <span className="hidden font-mono text-mono md:inline">
          {handle ? `@${handle}` : "sem conta"}
        </span>
      </span>
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
