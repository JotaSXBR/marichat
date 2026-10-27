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
