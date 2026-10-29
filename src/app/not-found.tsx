import Link from "next/link";

import { Button } from "@/components/ui/button";

/** URL pública desconhecida: fora do painel, sem navegação administrativa. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1240px] flex-col justify-center px-4 py-16">
      <p className="font-mono text-mono text-muted-foreground">404</p>
      <h1 className="mt-2 text-display text-foreground">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-[60ch] text-body text-muted-foreground">
        O endereço não existe ou foi movido.
      </p>
      <Button asChild className="mt-6 w-fit" size="lg" variant="secondary">
        <Link href="/admin">Ir para o painel</Link>
      </Button>
    </main>
  );
}
