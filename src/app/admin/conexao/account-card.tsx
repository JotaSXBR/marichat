import type { ReactNode } from "react";

import { ConfirmSubmitButton } from "@/app/admin/confirm-submit-button";
import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import {
  disconnectInstagram,
  registerZernioWebhook,
  resubscribeWebhooks,
} from "@/app/admin/conexao/actions";
import { connectionLabels } from "@/app/admin/labels";
import type { Account } from "@/lib/accounts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

type Props = {
  account: Account;
  isZernio: boolean;
  webhookError: string | null;
  subscribedAt: string | null;
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-subtle py-2.5 last:border-b-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="break-all text-right text-body text-foreground">
        {children}
      </dd>
    </div>
  );
}

function AccountDetails({ account, isZernio, subscribedAt }: Props) {
  return (
    <dl className="mt-5 border-t border-border">
      {isZernio ? (
        <Detail label="ID da conta na Zernio">
          <span className="font-mono text-mono">
            {account.providerAccountId ?? "—"}
          </span>
        </Detail>
      ) : (
        <Detail label="ID na API">
          <span className="font-mono text-mono">{account.instagramUserId}</span>
        </Detail>
      )}
      <Detail label={isZernio ? "Token" : "Token expira em"}>
        {isZernio
          ? "gerenciado pela Zernio"
          : formatDateTime(account.tokenExpiresAt)}
      </Detail>
      <Detail label="Webhooks">
        {isZernio ? "Webhook registrado" : "Campos assinados"}
      </Detail>
      <Detail label="Assinado em">
        {subscribedAt ? formatDateTime(new Date(subscribedAt)) : "—"}
      </Detail>
    </dl>
  );
}

function AccountActions({ isZernio }: Pick<Props, "isZernio">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isZernio ? null : (
        <Button asChild className="max-sm:h-12" variant="secondary">
          <a href="/api/auth/instagram/start">
            <RefreshCwIcon aria-hidden />
            Reconectar
          </a>
        </Button>
      )}
      <form action={isZernio ? registerZernioWebhook : resubscribeWebhooks}>
        <Button className="max-sm:h-12" type="submit" variant="secondary">
          {isZernio ? "Registrar webhook na Zernio" : "Reassinar webhooks"}
        </Button>
      </form>
      <form action={disconnectInstagram}>
        <ConfirmSubmitButton
          className="max-sm:h-12"
          message="As automações param imediatamente e nenhuma mensagem será enviada até reconectar."
        >
          Desconectar
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

/** Dados da conta conectada, situação dos webhooks e ações. */
export function AccountCard({
  account,
  isZernio,
  webhookError,
  subscribedAt,
}: Props) {
  const status = connectionLabels[account.connectionStatus] ?? {
    label: account.connectionStatus,
    tone: "neutral" as const,
  };

  return (
    <section aria-labelledby="conta-title" className="min-w-0">
      <h2 className="text-section text-foreground" id="conta-title">
        Conta atual
      </h2>
      <p className="mt-1 text-label text-muted-foreground">
        O perfil que recebe os comentários e envia as DMs.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>
            {account.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <p className="truncate font-mono text-mono text-foreground">
            @{account.username}
          </p>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
        </div>
      </div>

      <AccountDetails
        account={account}
        isZernio={isZernio}
        subscribedAt={subscribedAt}
        webhookError={webhookError}
      />

      {webhookError ? (
        <Alert className="mt-5" variant="warning">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Inscrição de webhooks com erro</AlertTitle>
          <AlertDescription>{webhookError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <AccountActions isZernio={isZernio} />
      </div>
    </section>
  );
}
