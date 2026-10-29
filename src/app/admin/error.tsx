"use client";

import { useEffect } from "react";
import { RotateCwIcon } from "lucide-react";

import { PageHeader } from "@/components/marichat/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Boundary das telas do painel. `retry` é o nome estável no Next 16.3+ (era
 * `reset`); re-renderiza o segmento sem exigir recarregar a página.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error && typeof error === "object" && "digest" in error
      ? String(error.digest)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader meta="erro ao consultar esta tela" title="Algo falhou" />

      <Alert variant="danger">
        <AlertTitle>Não foi possível carregar a tela</AlertTitle>
        <AlertDescription>
          Pode ser uma falha temporária de banco ou de rede. Tente de novo; se
          continuar, confira os logs do servidor.
          {digest ? (
            <span className="mt-2 block font-mono text-[0.75rem]">
              código: {digest}
            </span>
          ) : null}
        </AlertDescription>
      </Alert>

      <Button onClick={() => retry()} size="lg" variant="secondary">
        <RotateCwIcon aria-hidden />
        Tentar novamente
      </Button>
    </div>
  );
}
