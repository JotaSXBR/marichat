import type { ReactNode } from "react";

import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import {
  testInstagramConnection,
  testZernioConnection,
} from "@/app/admin/conexao/actions";
import type { ConnectionTestResult } from "@/lib/instagram/diagnostics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

type Props = {
  isZernio: boolean;
  test: ConnectionTestResult | null;
};

function CheckLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2Icon : XCircleIcon;
  return (
    <li className="flex items-start gap-2">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          ok ? "text-success" : "text-danger",
        )}
      />
      <span className="text-body text-foreground">{children}</span>
    </li>
  );
}

function tokenLine(test: ConnectionTestResult, isZernio: boolean): string {
  if (test.tokenOk) {
    return isZernio ? "Chave da Zernio aceita" : "Token aceito";
  }
  return isZernio
    ? "Chave da Zernio recusada ou ausente"
    : "Token recusado ou ilegível";
}

function subscriptionLine(test: ConnectionTestResult, isZernio: boolean) {
  if (!test.subscriptionChecked) {
    return "Webhooks: não foi possível conferir";
  }
  if (test.missingFields.length > 0) {
    return `Webhooks: faltam ${test.missingFields.join(", ")}`;
  }
  return isZernio
    ? "Webhook: segredo configurado"
    : "Webhooks: todos os campos exigidos estão assinados";
}

function TestResult({
  test,
  isZernio,
}: Props & { test: ConnectionTestResult }) {
  const subscriptionOk =
    test.subscriptionChecked && test.missingFields.length === 0;

  return (
    <div className="space-y-3">
      <p className="text-label text-muted-foreground">
        Último teste em {formatDateTime(new Date(test.checkedAt))}.
      </p>

      <ul className="grid gap-2">
        <CheckLine ok={test.tokenOk}>
          {tokenLine(test, isZernio)}
          {test.username ? ` — @${test.username}` : ""}
        </CheckLine>
        <CheckLine ok={subscriptionOk}>
          {subscriptionLine(test, isZernio)}
        </CheckLine>
      </ul>

      {test.subscribedFields.length > 0 ? (
        <p className="text-label text-muted-foreground">
          {isZernio ? "Eventos registrados" : "Campos assinados"}:{" "}
          <span className="font-mono text-mono">
            {test.subscribedFields.join(", ")}
          </span>
        </p>
      ) : null}

      {test.problems.length > 0 ? (
        <Alert variant="warning">
          <XCircleIcon aria-hidden />
          <AlertTitle>O que precisa de atenção</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {test.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="success">
          <CheckCircle2Icon aria-hidden />
          <AlertTitle>Tudo certo</AlertTitle>
          <AlertDescription>
            {isZernio
              ? "Chave válida, conta ativa e segredo do webhook configurado."
              : "Token válido e webhooks completos."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Teste da conexão e resultado da última verificação. */
export function DiagnosticsCard({ isZernio, test }: Props) {
  return (
    <section aria-labelledby="diagnostico-title" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section text-foreground" id="diagnostico-title">
            Diagnóstico da conexão
          </h2>
          <p className="mt-1 max-w-[52ch] text-label text-muted-foreground">
            {isZernio
              ? "Confere se a chave da Zernio é aceita e se a conta vinculada continua ativa lá."
              : "Confere se o token ainda é aceito pela Meta e se os campos de webhook estão assinados nesta conta."}
          </p>
        </div>
        <form
          action={isZernio ? testZernioConnection : testInstagramConnection}
          className="max-sm:w-full"
        >
          <Button
            className="max-sm:h-12 max-sm:w-full"
            type="submit"
            variant="secondary"
          >
            Testar conexão
          </Button>
        </form>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        {test ? (
          <TestResult test={test} isZernio={isZernio} />
        ) : (
          <p className="text-body text-muted-foreground">
            {isZernio
              ? "Nenhum teste executado desde a conexão. Rode o teste depois de registrar o webhook."
              : "Nenhum teste executado desde a conexão. Rode o teste depois de configurar os webhooks no painel da Meta."}
          </p>
        )}
      </div>
    </section>
  );
}
