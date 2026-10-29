import Link from "next/link";

import { PageHeader } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";

/** `notFound()` do editor cai aqui, dentro da casca do painel. */
export default function AdminNotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        meta="automação removida ou endereço inválido"
        title="Não encontrado"
      />

      <p className="max-w-[70ch] text-body text-muted-foreground">
        Essa automação não existe nesta conta. Ela pode ter sido removida ou o
        endereço está incorreto.
      </p>

      <Button asChild size="lg" variant="secondary">
        <Link href="/admin/automacoes">Voltar para automações</Link>
      </Button>
    </div>
  );
}
