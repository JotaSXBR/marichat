import { safeEqual } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";
import { runTick } from "@/lib/queue/drain";

/**
 * Tarefa agendada do Coolify (a cada minuto).
 * Protegida por segredo: Authorization: Bearer <CRON_SECRET>.
 *
 * Executa: recuperação de tarefas travadas, expiração por prazo da Meta,
 * envio da fila, renovação do token e limpeza de dados antigos.
 */

export const maxDuration = 60;

async function handle(request: Request) {
  let secret: string;
  try {
    secret = requireEnv("CRON_SECRET");
  } catch {
    return Response.json(
      { error: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runTick();
    return Response.json(
      { ok: true, ...result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[cron] falha na execução:", error);
    return Response.json(
      { ok: false, error: "Falha ao executar a tarefa agendada." },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
