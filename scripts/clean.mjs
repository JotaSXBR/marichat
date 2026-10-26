#!/usr/bin/env node
/**
 * Limpeza local: apaga artefatos de build e caches regeneráveis.
 *
 * Nada aqui é código-fonte. O próximo `npm run dev` ou `npm run build`
 * recria o que for preciso. Rodar quando o disco apertar ou depois de
 * investigar um problema estranho de build.
 *
 * Uso: npm run clean
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const targets = [".next", "coverage", "tsconfig.tsbuildinfo", ".turbo"];

function sizeOf(target) {
  const info = statSync(target);
  if (!info.isDirectory()) return info.size;

  let total = 0;
  for (const entry of readdirSync(target)) {
    total += sizeOf(path.join(target, entry));
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

let freed = 0;
let removed = 0;

for (const target of targets) {
  const full = path.join(process.cwd(), target);
  if (!existsSync(full)) continue;

  try {
    freed += sizeOf(full);
    rmSync(full, { recursive: true, force: true });
    removed += 1;
    console.log(`removido: ${target}`);
  } catch (error) {
    console.error(`não foi possível remover ${target}:`, error.message);
    process.exitCode = 1;
  }
}

if (removed === 0) {
  console.log("Nada para limpar: a pasta já está enxuta.");
} else {
  console.log(
    `Limpeza concluída: ${removed} item(ns), ${formatBytes(freed)} liberados.`,
  );
}
