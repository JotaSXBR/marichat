import { expect, test } from "@playwright/test";

/** Fumaça do harness: o painel precisa abrir autenticado e renderizar. */
test("o painel abre autenticado e mostra o título", async ({ page }) => {
  const response = await page.goto("/admin");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
