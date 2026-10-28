/**
 * Auditoria de acessibilidade e layout das rotas do painel com Playwright + axe.
 *
 * Uso:
 *   1. npm run dev
 *   2. npm run a11y
 *
 * Lê ADMIN_PASSWORD e APP_URL de .env.local. Salva capturas em .stitch/v5/ e
 * falha (exit 1) em qualquer violação WCAG A/AA ou scroll horizontal.
 */

import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

function localEnv() {
  const values = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

const env = localEnv();
const base = env.APP_URL ?? "http://localhost:3000";
const password = env.ADMIN_PASSWORD;

if (!password) {
  throw new Error("ADMIN_PASSWORD não definido em .env.local");
}

const ROUTES = [
  { path: "/admin", name: "visao-geral" },
  { path: "/admin/automacoes", name: "automacoes" },
  { path: "/admin/automacoes/nova", name: "editor" },
  { path: "/admin/atividade", name: "atividade" },
  { path: "/admin/atividade?aba=envios", name: "atividade-envios" },
  { path: "/admin/atividade?aba=webhooks", name: "atividade-webhooks" },
  { path: "/admin/conexao", name: "conexao" },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "small", width: 320, height: 740 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();
let failures = 0;

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    httpCredentials: { username: "admin", password },
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    const response = await page.goto(`${base}${route.path}`, {
      waitUntil: "load",
    });
    await page.waitForSelector("h1");
    await page.waitForTimeout(400);

    if (!response || response.status() >= 400) {
      console.error(
        `✗ ${viewport.name} ${route.path}: HTTP ${response?.status() ?? "sem resposta"}`,
      );
      failures += 1;
      continue;
    }

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    await page.screenshot({
      fullPage: true,
      path: `.stitch/v5/impl-${route.name}-${viewport.name}.png`,
    });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `.stitch/v5/impl-${route.name}-${viewport.name}-bottom.png`,
    });
    await page.evaluate(() => window.scrollTo(0, 0));

    if (violations.length === 0 && overflow <= 0) {
      console.log(`✓ ${viewport.name} ${route.path}`);
      continue;
    }

    failures += 1;
    console.error(
      `✗ ${viewport.name} ${route.path} — ${violations.length} violação(ões), overflow ${overflow}px`,
    );
    for (const violation of violations) {
      console.error(
        `  [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length})`,
      );
      for (const node of violation.nodes.slice(0, 3)) {
        console.error(`    ${node.target.join(" ")}`);
        console.error(
          `    ${node.failureSummary?.split("\n")[1]?.trim() ?? ""}`,
        );
      }
    }
  }

  await context.close();
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} página(s) reprovada(s).`);
  process.exitCode = 1;
} else {
  console.log(
    "\nTodas as páginas passaram no axe e não têm scroll horizontal.",
  );
}
