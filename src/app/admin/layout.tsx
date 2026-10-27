import type { Metadata } from "next";

import { getActiveAccount } from "@/lib/accounts";
import { AdminNav } from "@/components/marichat/admin-nav";

export const metadata: Metadata = {
  title: "MARICHAT — painel",
  description: "Automação de comentários e mensagens do Instagram.",
};

// O painel sempre depende do banco e da autenticação no servidor:
// não há casca estática a pré-renderizar.
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const account = await getActiveAccount();

  return (
    <div className="min-h-screen">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-popover focus:px-4 focus:py-2 focus:text-label focus:text-foreground"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>

      <AdminNav
        connected={account?.connectionStatus === "connected"}
        handle={account?.username ?? null}
      />

      <main className="mx-auto max-w-[1240px] px-4 pt-32 pb-16" id="conteudo">
        {children}
      </main>
    </div>
  );
}
