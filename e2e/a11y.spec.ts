import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Auditoria de acessibilidade e layout do painel (axe WCAG A/AA + scroll
 * horizontal), nas três larguras e nos dois temas. Portado de
 * scripts/a11y.mjs para rodar no CI junto com os demais specs.
 */

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

const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`a11y ${theme} ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const route of ROUTES) {
        test(`${route.name} passa no axe sem scroll horizontal`, async ({
          page,
        }) => {
          await page.addInitScript((value) => {
            localStorage.setItem("marichat-theme", value);
          }, theme);

          const response = await page.goto(route.path);
          expect(response?.status(), `HTTP de ${route.path}`).toBeLessThan(400);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          // O streaming ainda pode estar pintando quando o h1 aparece.
          await page.waitForLoadState("networkidle");

          const { violations } = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();

          expect(
            violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              help: violation.help,
              nodes: violation.nodes.map((node) => node.target.join(" ")),
            })),
          ).toEqual([]);

          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          expect(overflow, "scroll horizontal em px").toBeLessThanOrEqual(0);
        });
      }
    });
  }
}
