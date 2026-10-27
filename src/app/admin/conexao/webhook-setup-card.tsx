type Props = {
  isZernio: boolean;
  appUrl?: string;
};

/** Instruções de configuração do webhook no painel escolhido. */
export function WebhookSetupCard({ isZernio, appUrl }: Props) {
  const endpoint = appUrl
    ? `${appUrl}${isZernio ? "/api/webhook/zernio" : "/api/webhook"}`
    : "(APP_URL ainda não configurada)";

  if (isZernio) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium">Configuração na Zernio</h2>
        <p className="mt-2 text-sm text-zinc-600">
          O webhook da Zernio deve apontar para:
        </p>
        <code className="mt-1 block break-all rounded-md bg-zinc-100 px-3 py-2 text-xs">
          {endpoint}
        </code>
        <p className="mt-2 text-sm text-zinc-600">
          Assine os eventos <strong>comment.received</strong> e{" "}
          <strong>message.received</strong>. O segredo usado na assinatura é o
          valor de{" "}
          <code className="rounded bg-zinc-100 px-1">
            ZERNIO_WEBHOOK_SECRET
          </code>
          .
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          O botão <strong>Registrar webhook na Zernio</strong> cria esse
          endpoint automaticamente. Se você já criou um endpoint no painel da
          Zernio, evite clicar para não duplicar.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium">Configuração no painel da Meta</h2>
      <p className="mt-2 text-sm text-zinc-600">
        No app da Meta, o webhook do Instagram deve apontar para:
      </p>
      <code className="mt-1 block break-all rounded-md bg-zinc-100 px-3 py-2 text-xs">
        {endpoint}
      </code>
      <p className="mt-2 text-sm text-zinc-600">
        Assine os campos <strong>comments</strong>, <strong>messages</strong> e{" "}
        <strong>messaging_postbacks</strong>. O token de verificação é o valor
        de{" "}
        <code className="rounded bg-zinc-100 px-1">
          META_WEBHOOK_VERIFY_TOKEN
        </code>
        .
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        <strong>messaging_postbacks</strong> é necessário para receber o toque
        em &quot;Já segui&quot;. Sem ele, quem toca no botão não recebe o link.
        Os três campos precisam estar ativos também nas assinaturas do app (App
        Dashboard → Webhooks → Instagram).
      </p>
    </section>
  );
}
