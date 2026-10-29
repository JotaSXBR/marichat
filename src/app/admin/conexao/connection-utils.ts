/** Textos e constantes da tela de Conexão (sem JSX). */

export const errorMessages: Record<string, string> = {
  configuracao:
    "Faltam configurações no servidor (variáveis de ambiente). Veja a lista abaixo.",
  autorizacao: "A autorização foi cancelada ou recusada no Instagram.",
  state: "A sessão de login expirou. Tente conectar novamente.",
  codigo: "O Instagram não devolveu o código de autorização.",
  conexao:
    "Não foi possível concluir a conexão. Confira os logs do Coolify e tente novamente.",
  "zernio-chave":
    "A chave da Zernio não está configurada no servidor. Defina ZERNIO_API_KEY e reinicie a aplicação.",
  "zernio-api":
    "A Zernio recusou a consulta. Confira se a chave está correta e se o servidor tem internet.",
  "zernio-conta":
    "A Zernio não devolveu nenhuma conta do Instagram conectada. Conecte a conta no painel da Zernio primeiro.",
  "zernio-escolha": "Escolha qual conta da Zernio deve ser usada.",
  "zernio-salvar":
    "Não foi possível guardar a conta no banco. Veja os logs do Coolify.",
};

export type EnvRequirement = readonly [name: string, description: string];

export const metaEnv: readonly EnvRequirement[] = [
  ["ADMIN_PASSWORD", "senha do painel"],
  ["APP_URL", "endereço público https"],
  ["DATABASE_URL", "banco PostgreSQL"],
  ["INSTAGRAM_APP_ID", "App ID da Meta"],
  ["INSTAGRAM_APP_SECRET", "App Secret da Meta"],
  ["META_WEBHOOK_VERIFY_TOKEN", "token de verificação do webhook"],
  ["TOKEN_ENCRYPTION_KEY", "chave que cifra o token do Instagram"],
  ["CRON_SECRET", "segredo da tarefa agendada"],
];

export const zernioEnv: readonly EnvRequirement[] = [
  ["ADMIN_PASSWORD", "senha do painel"],
  ["APP_URL", "endereço público https"],
  ["DATABASE_URL", "banco PostgreSQL"],
  ["TOKEN_ENCRYPTION_KEY", "chave que cifra o marcador da conta"],
  ["ZERNIO_API_KEY", "chave de API da Zernio"],
  ["ZERNIO_WEBHOOK_SECRET", "segredo do webhook da Zernio"],
  ["CRON_SECRET", "segredo da tarefa agendada"],
];

export function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

type TestLines = {
  tokenOk: boolean;
  subscriptionChecked: boolean;
  missingFields: string[];
};

export function tokenLine(test: TestLines, isZernio: boolean): string {
  if (test.tokenOk) {
    return isZernio ? "Chave da Zernio aceita" : "Token aceito";
  }
  return isZernio
    ? "Chave da Zernio recusada ou ausente"
    : "Token recusado ou ilegível";
}

export function subscriptionLine(test: TestLines, isZernio: boolean): string {
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

export type ConnectionNotice = {
  id: string;
  variant: "success" | "warning" | "danger" | "info";
  title: string;
  description: string;
};

export type ConnectionNoticeInput = {
  ok: boolean;
  accountName?: string;
  webhookRequested: boolean;
  errorCode?: string;
  disconnected: boolean;
  tested: boolean;
};

export function buildConnectionNotices({
  ok,
  accountName,
  webhookRequested,
  errorCode,
  disconnected,
  tested,
}: ConnectionNoticeInput): ConnectionNotice[] {
  const notices: ConnectionNotice[] = [];

  if (ok) {
    notices.push({
      id: "ok",
      variant: "success",
      title: "Conta conectada com sucesso",
      description: accountName
        ? `@${accountName} já pode disparar automações.`
        : "A conta já pode disparar automações.",
    });
  }

  if (disconnected) {
    notices.push({
      id: "disconnected",
      variant: "warning",
      title: "Conta desconectada",
      description:
        "As automações ficam pausadas e nenhuma mensagem será enviada até reconectar.",
    });
  }

  if (errorCode) {
    notices.push({
      id: "error",
      variant: "danger",
      title: "Não foi possível concluir",
      description:
        errorMessages[errorCode] ?? "Não foi possível concluir a operação.",
    });
  }

  if (webhookRequested) {
    notices.push({
      id: "webhook",
      variant: "info",
      title: "Pedido de registro enviado",
      description: "Confira o resultado em Conta atual.",
    });
  }

  if (tested) {
    notices.push({
      id: "tested",
      variant: "info",
      title: "Teste concluído",
      description: "Veja o resultado em Diagnóstico da conexão.",
    });
  }

  return notices;
}
