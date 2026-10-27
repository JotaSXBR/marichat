"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, Trash2, User2, Link2 } from "lucide-react";

import { CommandPalette } from "@/components/marichat/command-palette";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/automacoes", label: "Automações" },
  { href: "/admin/atividade", label: "Atividade" },
  { href: "/admin/conexao", label: "Conexão" },
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

/** R1 — navegação única, em pílula de vidro fixa no topo (§3, §4). */
export function AdminNav({
  handle,
  connected,
}: {
  handle: string | null;
  connected: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-6">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 rounded-xl glass px-3 sm:px-4">
        <Link
          className="shrink-0 font-heading text-title tracking-[-0.02em] text-foreground"
          href="/admin"
        >
          MARICHAT
        </Link>

        <DesktopNav pathname={pathname} />

        <div className="ml-auto flex items-center gap-2">
          <ConnectionChip connected={connected} handle={handle} />

          <CommandPalette className="hidden w-64 xl:block" />

          <MobileNav pathname={pathname} />

          <AccountMenu handle={handle} />
        </div>
      </div>
    </header>
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

function ConnectionChip({
  handle,
  connected,
}: {
  handle: string | null;
  connected: boolean;
}) {
  return (
    <Link
      className="hidden lg:block"
      href="/admin/conexao"
      title={
        handle
          ? `Conta @${handle} · ${connected ? "conectada" : "precisa de atenção"}`
          : "Nenhuma conta conectada"
      }
    >
      <StatusChip tone={connected ? "success" : handle ? "warning" : "neutral"}>
        {handle ? `@${handle}` : "Sem conta"}
      </StatusChip>
    </Link>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          aria-label="Abrir navegação"
          className="md:hidden"
          size="icon"
          variant="ghost"
        >
          <Menu />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>MARICHAT</DrawerTitle>
          <DrawerDescription>Ir para</DrawerDescription>
        </DrawerHeader>
        <nav
          aria-label="Seções do painel"
          className="flex flex-col gap-1 px-3 pb-4"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <DrawerClose asChild key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-md px-3 text-body",
                    active
                      ? "bg-secondary text-primary"
                      : "text-card-foreground hover:bg-surface-hover",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </DrawerClose>
            );
          })}
        </nav>
        <div className="border-t border-line-subtle p-3">
          <DrawerClose asChild>
            <Link
              className="flex h-11 items-center rounded-md px-3 text-body text-card-foreground hover:bg-surface-hover"
              href="/admin/automacoes/nova"
            >
              Nova automação
            </Link>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AccountMenu({ handle }: { handle: string | null }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menu da conta"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
