import { expect, test } from "@playwright/test";

/**
 * Comportamentos que antes só existiam em captura manual (Seção 2 do
 * BACKLOG): toggle de automação, filtro da Atividade, tema e erro ao salvar.
 * Dependem do seed: `npm run seed:e2e` antes.
 */

test("o toggle liga e desliga a automação sem sair da lista", async ({
  page,
}) => {
  await page.goto("/admin/automacoes");

  const row = page.getByRole("row").filter({ hasText: "Campanha pausada" });
  const status = row.locator('[data-slot="status-chip"]');
  await expect(status).toHaveText("pausada");

  await row.getByRole("switch", { name: "Ativar automação" }).click();
  await expect(status).toHaveText("ativa");

  // Devolve o banco ao estado do seed para o teste poder repetir.
  await row.getByRole("switch", { name: "Desativar automação" }).click();
  await expect(status).toHaveText("pausada");
});

test("o filtro da Atividade aplica na hora e fica na URL", async ({ page }) => {
  await page.goto("/admin/atividade");
  await expect(page.getByText("@ana_souza").first()).toBeVisible();

  await page.getByLabel("Situação").selectOption("failed");

  await expect(page).toHaveURL(/situacao=failed/);
  await expect(page.getByText("@elisa_rocha").first()).toBeVisible();
  await expect(page.getByText("@ana_souza")).toHaveCount(0);
});

test("o tema escolhido sobrevive ao recarregar", async ({ page }) => {
  await page.goto("/admin");

  await page.getByRole("button", { name: /Menu da conta/ }).click();
  await page.getByRole("menuitemradio", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("salvar automação inválida mostra o erro sem navegar", async ({
  page,
}) => {
  await page.goto("/admin/automacoes/nova");

  await page.getByRole("button", { name: "Salvar automação" }).first().click();

  await expect(page.getByText("Não foi possível salvar")).toBeVisible();
  await expect(page.getByText("Revise os campos destacados.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/automacoes\/nova$/);
});
