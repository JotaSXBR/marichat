/**
 * Demonstração local do fluxo completo, SEM enviar nada para a Meta.
 *
 * Sobe uma API do Instagram simulada em http://127.0.0.1:4010, cadastra uma
 * conta e uma automação no banco local, envia o webhook assinado de comentário
 * e depois o de resposta da pessoa na DM, executando a fila pelo endpoint de
 * cron.
 *
 * Uso:
 *   1. npm run dev                (em outro terminal)
 *   2. npm run demo:local
 *
 * A implementação vive em `scripts/demo/`; este arquivo é só a porta de
 * entrada usada pelo script `demo:local` do package.json.
 */

import { run } from "./demo/run.mjs";

run().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
