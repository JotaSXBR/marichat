/**
 * Sobe o servidor do pacote standalone (o mesmo que roda no container) para os
 * testes de navegador. O Dockerfile copia `public` e `.next/static` para dentro
 * do pacote antes de executar; aqui é o mesmo passo, senão a página vem sem CSS.
 *
 * Uso: node scripts/start-e2e.mjs <porta>   (depois de `npm run build`)
 */

import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const standalone = ".next/standalone";

if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("Pacote standalone ausente: rode `npm run build` antes.");
}

cpSync(".next/static", join(standalone, ".next/static"), { recursive: true });
cpSync("public", join(standalone, "public"), { recursive: true });

process.env.PORT = process.argv[2] ?? "3100";
process.env.HOSTNAME = "127.0.0.1";

await import("../.next/standalone/server.js");
