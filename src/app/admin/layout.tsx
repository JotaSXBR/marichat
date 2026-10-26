import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MARICHAT — painel",
  description: "Automação de comentários e mensagens do Instagram.",
};

// O painel sempre depende do banco e da autenticação no servidor:
// não há casca estática a pré-renderizar.
export const instant = false;

const navItems = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/automacoes", label: "Automações" },
  { href: "/admin/conexao", label: "Conexão" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            MARICHAT
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-zinc-600 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
