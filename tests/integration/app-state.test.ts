import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  clearAppStateValue,
  getAppStateValue,
  setAppStateValue,
} from "@/lib/accounts";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
} from "../helpers/db";

const suite = hasTestDatabase ? describe : describe.skip;

/**
 * `value` é `jsonb NOT NULL`: gravar `null` estourava ao limpar o erro de
 * webhook e escondia o sucesso do registro na Zernio.
 */
suite("app_state", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await closeTestDatabase();
  });

  it("guarda e lê um valor", async () => {
    await setAppStateValue("webhook_subscribed_at", "2026-10-27T22:00:00.000Z");
    await expect(getAppStateValue("webhook_subscribed_at")).resolves.toBe(
      "2026-10-27T22:00:00.000Z",
    );
  });

  it("limpa a chave sem violar o NOT NULL", async () => {
    await setAppStateValue("webhook_subscription_error", "falhou ontem");

    await clearAppStateValue("webhook_subscription_error");

    await expect(
      getAppStateValue("webhook_subscription_error"),
    ).resolves.toBeNull();
  });

  it("limpar uma chave inexistente não falha", async () => {
    await expect(
      clearAppStateValue("zernio_connection_error"),
    ).resolves.toBeUndefined();
  });
});
