import { ConfirmSubmitButton } from "@/app/admin/confirm-submit-button";
import { formatDateTime } from "@/app/admin/conexao/connection-utils";
import {
  disconnectInstagram,
  registerZernioWebhook,
  resubscribeWebhooks,
} from "@/app/admin/conexao/actions";
import type { Account } from "@/lib/accounts";

type Props = {
  account: Account;
  isZernio: boolean;
  webhookError: string | null;
  subscribedAt: string | null;
};

function AccountDetails({ account, isZernio }: Props) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      <div>
        <dt className="text-zinc-500">Perfil</dt>
        <dd className="font-medium">@{account.username}</dd>
      </div>
      {isZernio ? (
        <div>
          <dt className="text-zinc-500">ID da conta na Zernio</dt>
          <dd className="break-all font-mono text-xs">
            {account.providerAccountId ?? "—"}
          </dd>
        </div>
      ) : (
        <div>
          <dt className="text-zinc-500">ID na API</dt>
          <dd className="font-mono text-xs">{account.instagramUserId}</dd>
        </div>
      )}
      <div>
        <dt className="text-zinc-500">Status</dt>
        <dd>{account.connectionStatus}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">
          {isZernio ? "Token" : "Token expira em"}
        </dt>
        <dd>
          {isZernio
            ? "gerenciado pela Zernio"
            : formatDateTime(account.tokenExpiresAt)}
        </dd>
      </div>
    </dl>
  );
}

function WebhookStatus({
  isZernio,
  webhookError,
  subscribedAt,
}: Pick<Props, "isZernio" | "webhookError" | "subscribedAt">) {
  if (webhookError) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
        Inscrição de webhooks com erro: {webhookError}
      </p>
    );
  }

  return (
    <p className="text-xs text-zinc-500">
      {isZernio ? "Webhook registrado" : "Webhooks inscritos"} em{" "}
      {subscribedAt ? formatDateTime(new Date(subscribedAt)) : "—"}.
    </p>
  );
}

function AccountActions({ isZernio }: Pick<Props, "isZernio">) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {isZernio ? null : (
        <a
          href="/api/auth/instagram/start"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Reconectar / trocar de conta
        </a>
      )}
      <form action={isZernio ? registerZernioWebhook : resubscribeWebhooks}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          {isZernio ? "Registrar webhook na Zernio" : "Reassinar webhooks"}
        </button>
      </form>
      <form action={disconnectInstagram}>
        <ConfirmSubmitButton
          message="Desconectar o Instagram? As automações param imediatamente."
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Desconectar
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

/** Dados da conta conectada e ações de webhook/desconexão. */
export function AccountCard(props: Props) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium">Conta atual</h2>
      <div className="mt-3 space-y-3 text-sm">
        <AccountDetails {...props} />
        <WebhookStatus {...props} />
        <AccountActions isZernio={props.isZernio} />
      </div>
    </section>
  );
}
