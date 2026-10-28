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
import { SectionHeading } from "@/components/marichat/page-header";
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
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="break-all text-right font-mono text-[0.8125rem] text-foreground">
        {children}
      </dd>
    </div>
  );
}

function AccountDetails({ account, isZernio, subscribedAt }: Props) {
  return (
    <dl>
      {isZernio ? (
        <Detail label="ID da conta na Zernio">
          {account.providerAccountId ?? "—"}
        </Detail>
      ) : (
        <Detail label="ID na API">{account.instagramUserId}</Detail>
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
        <Button asChild className="max-sm:h-11" variant="secondary">
          <a href="/api/auth/instagram/start">
            <RefreshCwIcon aria-hidden />
            Reconectar
          </a>
        </Button>
      )}
      <form action={isZernio ? registerZernioWebhook : resubscribeWebhooks}>
        <Button className="max-sm:h-11" type="submit" variant="secondary">
          {isZernio ? "Registrar webhook na Zernio" : "Reassinar webhooks"}
        </Button>
      </form>
      <form action={disconnectInstagram}>
        <ConfirmSubmitButton
          className="max-sm:h-11"
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
    <section aria-label="Conta atual" className="min-w-0">
      <SectionHeading title="Conta atual" />
      <p className="mt-2 max-w-[52ch] text-[0.8125rem] leading-5 text-muted-soft">
        O perfil que recebe os comentários e envia as DMs. O MARICHAT nunca vê
        sua senha do Instagram.
      </p>

      <div className="mt-4 flex items-center gap-3 border-b border-line-subtle pb-4">
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="text-[0.6875rem]">
            {account.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-mono text-[0.8125rem] text-foreground">
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
        <Alert className="mt-4" variant="warning">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Inscrição de webhooks com erro</AlertTitle>
          <AlertDescription>{webhookError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4">
        <AccountActions isZernio={isZernio} />
      </div>
    </section>
  );
}
