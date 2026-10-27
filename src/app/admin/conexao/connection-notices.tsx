import { errorMessages } from "@/app/admin/conexao/connection-utils";

type Props = {
  ok: boolean;
  accountName?: string;
  webhookRequested: boolean;
  errorCode?: string;
  disconnected: boolean;
  tested: boolean;
};

/** Avisos de sucesso/erro exibidos no topo da tela. */
export function ConnectionNotices({
  ok,
  accountName,
  webhookRequested,
  errorCode,
  disconnected,
  tested,
}: Props) {
  return (
    <>
      {ok ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          Conta conectada com sucesso
          {accountName ? `: @${accountName}` : ""}.
        </div>
      ) : null}

      {webhookRequested ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          Pedido de registro do webhook enviado. Confira o resultado em{" "}
          <strong>Conta atual</strong>.
        </div>
      ) : null}

      {errorCode ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {errorMessages[errorCode] ?? "Não foi possível concluir a operação."}
        </div>
      ) : null}

      {disconnected ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          Conta desconectada. As automações ficam pausadas e nenhuma mensagem
          será enviada até reconectar.
        </div>
      ) : null}

      {tested ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          Teste concluído. Veja o resultado em{" "}
          <strong>Diagnóstico da conexão</strong>.
        </div>
      ) : null}
    </>
  );
}
