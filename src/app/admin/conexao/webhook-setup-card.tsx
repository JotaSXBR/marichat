import { CopyButton } from "@/app/admin/conexao/copy-button";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";

type Props = {
  isZernio: boolean;
  appUrl?: string;
};

function Endpoint({ value }: { value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line-subtle bg-muted px-3 py-2">
      <code className="min-w-0 flex-1 break-all font-mono text-mono text-foreground">
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}

function MetaGuide({ endpoint }: { endpoint: string }) {
  return (
    <>
      <Endpoint value={endpoint} />
      <p className="text-[0.875rem] leading-6 text-muted-foreground">
        Assine os campos <strong>comments</strong>, <strong>messages</strong> e{" "}
        <strong>messaging_postbacks</strong>. O token de verificação é o valor
        de <code className="font-mono">META_WEBHOOK_VERIFY_TOKEN</code>.
      </p>
      <p className="text-[0.8125rem] leading-5 text-muted-soft">
        <strong>messaging_postbacks</strong> é necessário para receber o toque
        em &quot;Já segui&quot;. Os três campos precisam estar ativos também nas
        assinaturas do app (App Dashboard → Webhooks → Instagram).
      </p>
      <Button asChild className="w-fit" size="sm" variant="secondary">
        <a
          href="https://developers.facebook.com/apps/"
          rel="noreferrer"
          target="_blank"
        >
          Abrir o painel da Meta
          <ExternalLinkIcon aria-hidden />
        </a>
      </Button>
    </>
  );
}

function ZernioGuide({ endpoint }: { endpoint: string }) {
  return (
    <>
      <Endpoint value={endpoint} />
      <p className="text-[0.875rem] leading-6 text-muted-foreground">
        Assine os eventos <strong>comment.received</strong> e{" "}
        <strong>message.received</strong>. O segredo usado na assinatura é o
        valor de <code className="font-mono">ZERNIO_WEBHOOK_SECRET</code>.
      </p>
      <p className="text-[0.8125rem] leading-5 text-muted-soft">
        O botão <strong>Registrar webhook na Zernio</strong> cria esse endpoint
        automaticamente. Se você já criou um endpoint no painel da Zernio, evite
        clicar para não duplicar.
      </p>
      <Button asChild className="w-fit" size="sm" variant="secondary">
        <a href="https://zernio.com" rel="noreferrer" target="_blank">
          Abrir o painel da Zernio
          <ExternalLinkIcon aria-hidden />
        </a>
      </Button>
    </>
  );
}

/** Endereço do webhook e o que assinar em cada transporte. */
export function WebhookSetupCard({ isZernio, appUrl }: Props) {
  const endpoint = appUrl
    ? `${appUrl}${isZernio ? "/api/webhook/zernio" : "/api/webhook"}`
    : "(APP_URL ainda não configurada)";

  return (
    <section className="border-b border-border py-4">
      <h2 className="text-[0.875rem] font-semibold text-foreground">
        {isZernio ? "Webhook na Zernio" : "Webhook na Meta"}
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-5 text-muted-soft">
        {appUrl
          ? "Copie o endereço e confira os campos assinados."
          : "Defina APP_URL no servidor para gerar o endereço do webhook."}
      </p>
      <div className="mt-3 space-y-3">
        {isZernio ? (
          <ZernioGuide endpoint={endpoint} />
        ) : (
          <MetaGuide endpoint={endpoint} />
        )}
      </div>
    </section>
  );
}
