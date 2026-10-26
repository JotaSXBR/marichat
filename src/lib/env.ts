import "server-only";

/**
 * Leitura de variáveis de ambiente em tempo de execução.
 *
 * Nada aqui roda no build: as funções só são chamadas quando o valor é
 * realmente necessário. Assim o projeto compila mesmo sem DATABASE_URL e
 * falha com mensagem clara apenas quando a configuração ausente é usada.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Configuração ausente: ${name}. Defina essa variável de ambiente no Coolify (ou no .env.local em desenvolvimento) e reinicie a aplicação.`,
    );
  }
  return value;
}

export function getAppUrl(): URL {
  const raw = requireEnv("APP_URL");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `APP_URL inválida: "${raw}". Use o endereço público HTTPS estável, por exemplo https://www.maricoachfit.com.`,
    );
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error(
      `APP_URL deve usar HTTPS em produção. Valor recebido: "${raw}".`,
    );
  }
  return url;
}

export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}
