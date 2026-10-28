import Link from "next/link";
import { PlugZapIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Bloco exibido quando ainda não há conta conectada. */
export function ConnectAccountNotice() {
  return (
    <div className="space-y-6">
      <h1 className="text-display text-foreground text-balance">Editar automação</h1>
      <Alert variant="warning">
        <PlugZapIcon aria-hidden />
        <AlertTitle>Conecte o Instagram primeiro</AlertTitle>
        <AlertDescription>
          <Link className="font-medium text-current" href="/admin/conexao">
            Ir para Conexão
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}
