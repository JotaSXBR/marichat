import type { ReactNode } from "react";

import {
  formatDateTime,
  subscriptionLine,
  tokenLine,
} from "@/app/admin/conexao/connection-utils";
import type { ConnectionTestResult } from "@/lib/instagram/diagnostics";
import { SectionHeading } from "@/components/marichat/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

type Props = {
  isZernio: boolean;
  test: ConnectionTestResult | null;
};

function CheckLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? CheckCircle2Icon : XCircleIcon;
  return (
    <li className="flex items-start gap-2.5 border-b border-line-subtle py-2.5 last:border-b-0">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          ok ? "text-success" : "text-danger",
        )}
      />
      <span className="text-[0.875rem] leading-5 text-foreground">
        {children}
      </span>
    </li>
  );
}

function TestResult({
  test,
  isZernio,
}: Props & { test: ConnectionTestResult }) {
  const subscriptionOk =
    test.subscriptionChecked && test.missingFields.length === 0;

  return (
    <div className="mt-4">
      <p className="text-[0.8125rem] text-muted-soft">
        Último teste em {formatDateTime(new Date(test.checkedAt))}.
      </p>

      <ul className="mt-2">
        <CheckLine ok={test.tokenOk}>
          {tokenLine(test, isZernio)}
          {test.username ? ` — @${test.username}` : ""}
        </CheckLine>
        <CheckLine ok={subscriptionOk}>
          {subscriptionLine(test, isZernio)}
        </CheckLine>
      </ul>

      {test.subscribedFields.length > 0 ? (
        <p className="mt-3 text-[0.8125rem] leading-5 text-muted-soft">
          {isZernio ? "Eventos registrados" : "Campos assinados"}:{" "}
          <span className="font-mono text-[0.75rem]">
            {test.subscribedFields.join(", ")}
          </span>
        </p>
      ) : null}

      {test.problems.length > 0 ? (
        <Alert className="mt-4" variant="warning">
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
        <Alert className="mt-4" variant="success">
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

/** Resultado da última verificação. O botão de testar vive no cabeçalho. */
export function DiagnosticsCard({ isZernio, test }: Props) {
  return (
    <section aria-label="Diagnóstico da conexão" className="min-w-0">
      <SectionHeading title="Diagnóstico" />
      <p className="mt-2 max-w-[52ch] text-[0.8125rem] leading-5 text-muted-soft">
        {isZernio
          ? "Confere se a chave da Zernio é aceita e se a conta vinculada continua ativa lá."
          : "Confere se o token ainda é aceito pela Meta e se os campos de webhook estão assinados nesta conta."}
      </p>

      {test ? (
        <TestResult test={test} isZernio={isZernio} />
      ) : (
        <p className="mt-4 border-b border-line-subtle py-4 text-sm text-muted-foreground">
          {isZernio
            ? "Nenhum teste executado desde a conexão. Rode o teste depois de registrar o webhook."
            : "Nenhum teste executado desde a conexão. Rode o teste depois de configurar os webhooks no painel da Meta."}
        </p>
      )}
    </section>
  );
}
