import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import {
  testInstagramConnection,
  testZernioConnection,
} from "@/app/admin/conexao/actions";
import type { ConnectionTestResult } from "@/lib/instagram/diagnostics";

type Props = {
  isZernio: boolean;
  test: ConnectionTestResult | null;
};

function tokenLine(test: ConnectionTestResult, isZernio: boolean): string {
  if (test.tokenOk) {
    return isZernio ? "✓ Chave da Zernio aceita" : "✓ Token aceito";
  }
  return isZernio
    ? "✗ Chave da Zernio recusada ou ausente"
    : "✗ Token recusado ou ilegível";
}

function subscriptionLine(test: ConnectionTestResult, isZernio: boolean) {
  if (!test.subscriptionChecked) {
    return "✗ Webhooks: não foi possível conferir";
  }
  if (test.missingFields.length > 0) {
    return `✗ Webhooks: faltam ${test.missingFields.join(", ")}`;
  }
  return isZernio
    ? "✓ Webhook: segredo configurado"
    : "✓ Webhooks: todos os campos exigidos estão assinados";
}

function TestResult({
  test,
  isZernio,
}: Props & { test: ConnectionTestResult }) {
  const subscriptionOk =
    test.subscriptionChecked && test.missingFields.length === 0;

  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-xs text-zinc-500">
        Último teste em {formatDateTime(new Date(test.checkedAt))}.
      </p>
      <ul className="space-y-1">
        <li className={test.tokenOk ? "text-green-700" : "text-red-700"}>
          {tokenLine(test, isZernio)}
          {test.username ? ` — @${test.username}` : ""}
        </li>
        <li className={subscriptionOk ? "text-green-700" : "text-red-700"}>
          {subscriptionLine(test, isZernio)}
        </li>
      </ul>
      {test.subscribedFields.length > 0 ? (
        <p className="text-xs text-zinc-500">
          {isZernio ? "Eventos registrados" : "Campos assinados"}:{" "}
          <span className="font-mono">{test.subscribedFields.join(", ")}</span>
        </p>
      ) : null}
      {test.problems.length > 0 ? (
        <ul className="list-disc space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 pl-7 text-amber-900">
          {test.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
          {isZernio
            ? "Tudo certo: chave válida, conta ativa e segredo do webhook configurado."
            : "Tudo certo: token válido e webhooks completos."}
        </p>
      )}
    </div>
  );
}

/** Botão de teste e resultado da última verificação. */
export function DiagnosticsCard({ isZernio, test }: Props) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Diagnóstico da conexão</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {isZernio
              ? "Confere se a chave da Zernio é aceita e se a conta vinculada continua ativa lá."
              : "Confere se o token ainda é aceito pela Meta e se os campos de webhook estão realmente assinados nesta conta."}
          </p>
        </div>
        <form
          action={isZernio ? testZernioConnection : testInstagramConnection}
        >
          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Testar conexão
          </button>
        </form>
      </div>

      {test ? (
        <TestResult test={test} isZernio={isZernio} />
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          {isZernio
            ? "Nenhum teste executado desde a conexão. Rode o teste depois de registrar o webhook."
            : "Nenhum teste executado desde a conexão. Rode o teste depois de configurar os webhooks no painel da Meta."}
        </p>
      )}
    </section>
  );
}
