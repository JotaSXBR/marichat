import Link from "next/link";
import { connection } from "next/server";

import { disconnectInstagram, resubscribeWebhooks, testInstagramConnection } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/app/admin/confirm-submit-button";
import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { webhookEvents } from "@/lib/db/schema";
import {
  CONNECTION_TEST_KEY,
  type ConnectionTestResult,
} from "@/lib/instagram/diagnostics";
import { desc } from "drizzle-orm";

const errorMessages: Record<string, string> = {
  configuracao:
    "Faltam configurações no servidor (variáveis de ambiente). Veja a lista abaixo.",
  autorizacao: "A autorização foi cancelada ou recusada no Instagram.",
  state: "A sessão de login expirou. Tente conectar novamente.",
  codigo: "O Instagram não devolveu o código de autorização.",
  conexao:
    "Não foi possível concluir a conexão. Confira os logs do Coolify e tente novamente.",
};

const requiredEnv = [
  ["ADMIN_PASSWORD", "senha do painel"],
  ["APP_URL", "endereço público https"],
  ["DATABASE_URL", "banco PostgreSQL"],
  ["INSTAGRAM_APP_ID", "App ID da Meta"],
  ["INSTAGRAM_APP_SECRET", "App Secret da Meta"],
  ["META_WEBHOOK_VERIFY_TOKEN", "token de verificação do webhook"],
  ["TOKEN_ENCRYPTION_KEY", "chave que cifra o token do Instagram"],
  ["CRON_SECRET", "segredo da tarefa agendada"],
] as const;

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export const instant = false;

export default async function ConnectionPage({
  searchParams,
}: PageProps<"/admin/conexao">) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const account = await getActiveAccount();
  const webhookError = await getAppStateValue<string>("webhook_subscription_error");
  const subscribedAt = await getAppStateValue<string>("webhook_subscribed_at");
  const connectionTest =
    await getAppStateValue<ConnectionTestResult>(CONNECTION_TEST_KEY);
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

  const db = getDb();
  const lastEvents = await db
    .select({
      eventKey: webhookEvents.eventKey,
      status: webhookEvents.status,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(5);

  const ok = get("ok") === "1";
  const erro = get("erro");
  const desconectado = get("desconectado") === "1";
  const warning = get("aviso");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Conexão com o Instagram</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A conexão usa o login oficial da Meta. O MARICHAT nunca vê sua senha do
          Instagram.
        </p>
      </div>

      {ok ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          Conta conectada com sucesso{get("conta") ? `: @${get("conta")}` : ""}.
          {warning === "webhook"
            ? " Porém, a inscrição dos webhooks falhou — use o botão de reassinar abaixo."
            : ""}
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {errorMessages[erro] ?? "Não foi possível concluir a operação."}
        </div>
      ) : null}

      {desconectado ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          Conta desconectada. As automações ficam pausadas e nenhuma mensagem
          será enviada até reconectar.
        </div>
      ) : null}

      {get("testado") === "1" ? (
        <div className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          Teste concluído. Veja o resultado em <strong>Diagnóstico da conexão</strong>.
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium">Conta atual</h2>
        {account ? (
          <div className="mt-3 space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Perfil</dt>
                <dd className="font-medium">@{account.username}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">ID na API</dt>
                <dd className="font-mono text-xs">{account.instagramUserId}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd>{account.connectionStatus}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Token expira em</dt>
                <dd>{formatDateTime(account.tokenExpiresAt)}</dd>
              </div>
            </dl>

            {webhookError ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                Inscrição de webhooks com erro: {webhookError}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Webhooks inscritos em {subscribedAt ? formatDateTime(new Date(subscribedAt)) : "—"}.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/api/auth/instagram/start"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Reconectar / trocar de conta
              </a>
              <form action={resubscribeWebhooks}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Reassinar webhooks
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
          </div>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <p className="text-zinc-600">
              Nenhuma conta conectada. Use uma conta profissional do Instagram
              (criador ou empresa) com acesso às mensagens.
            </p>
            <a
              href="/api/auth/instagram/start"
              className="inline-block rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Conectar Instagram
            </a>
          </div>
        )}
      </section>

      {account ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Diagnóstico da conexão</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Confere se o token ainda é aceito pela Meta e se os campos de
                webhook estão realmente assinados nesta conta.
              </p>
            </div>
            <form action={testInstagramConnection}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Testar conexão
              </button>
            </form>
          </div>

          {connectionTest ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-xs text-zinc-500">
                Último teste em{" "}
                {formatDateTime(new Date(connectionTest.checkedAt))}.
              </p>
              <ul className="space-y-1">
                <li
                  className={
                    connectionTest.tokenOk ? "text-green-700" : "text-red-700"
                  }
                >
                  {connectionTest.tokenOk ? "✓ Token aceito" : "✗ Token recusado ou ilegível"}
                  {connectionTest.username ? ` — @${connectionTest.username}` : ""}
                </li>
                <li
                  className={
                    connectionTest.subscriptionChecked &&
                    connectionTest.missingFields.length === 0
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  {!connectionTest.subscriptionChecked
                    ? "✗ Webhooks: não foi possível conferir"
                    : connectionTest.missingFields.length === 0
                      ? "✓ Webhooks: todos os campos exigidos estão assinados"
                      : `✗ Webhooks: faltam ${connectionTest.missingFields.join(", ")}`}
                </li>
              </ul>
              {connectionTest.subscribedFields.length > 0 ? (
                <p className="text-xs text-zinc-500">
                  Campos assinados:{" "}
                  <span className="font-mono">
                    {connectionTest.subscribedFields.join(", ")}
                  </span>
                </p>
              ) : null}
              {connectionTest.problems.length > 0 ? (
                <ul className="list-disc space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 pl-7 text-amber-900">
                  {connectionTest.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
                  Tudo certo: token válido e webhooks completos.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              Nenhum teste executado desde a conexão. Rode o teste depois de
              configurar os webhooks no painel da Meta.
            </p>
          )}
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium">Configuração no painel da Meta</h2>
        <p className="mt-2 text-sm text-zinc-600">
          No app da Meta, o webhook do Instagram deve apontar para:
        </p>
        <code className="mt-1 block break-all rounded-md bg-zinc-100 px-3 py-2 text-xs">
          {appUrl ? `${appUrl}/api/webhook` : "(APP_URL ainda não configurada)"}
        </code>
        <p className="mt-2 text-sm text-zinc-600">
          Assine os campos <strong>comments</strong>, <strong>messages</strong> e{" "}
          <strong>messaging_postbacks</strong>. O token de verificação é o valor
          de <code className="rounded bg-zinc-100 px-1">META_WEBHOOK_VERIFY_TOKEN</code>.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          <strong>messaging_postbacks</strong> é necessário para receber o toque
          em &quot;Já segui&quot;. Sem ele, quem toca no botão não recebe o link.
          Os três campos precisam estar ativos também nas assinaturas do app
          (App Dashboard → Webhooks → Instagram).
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium">Variáveis de ambiente</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {requiredEnv.map(([name, description]) => {
            const present = Boolean(process.env[name]?.trim());
            return (
              <li key={name} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={present ? "text-green-600" : "text-red-600"}
                >
                  {present ? "✓" : "✗"}
                </span>
                <span>
                  <code className="text-xs">{name}</code>
                  <span className="block text-xs text-zinc-500">{description}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Os valores nunca são exibidos aqui. Altere-os no Coolify e reinicie a
          aplicação.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium">Últimos webhooks recebidos</h2>
        </div>
        {lastEvents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Nenhum evento recebido ainda. Publique um comentário de teste para
            conferir.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {lastEvents.map((event) => (
              <li
                key={event.eventKey}
                className="flex flex-wrap justify-between gap-2 px-4 py-2"
              >
                <span className="font-mono text-xs">{event.eventKey}</span>
                <span className="text-xs text-zinc-500">
                  {event.status} · {formatDateTime(event.receivedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm">
        <Link href="/admin" className="text-zinc-600 underline">
          Voltar para a visão geral
        </Link>
      </p>
    </div>
  );
}
