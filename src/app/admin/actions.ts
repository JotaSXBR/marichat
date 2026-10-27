"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import {
  automationColumns,
  automationSchema,
  readAutomationForm,
  type AutomationFormState,
} from "@/lib/automation-input";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";
import { readText } from "@/lib/form-data";

/** Ações do painel. Todas revalidam a autenticação no servidor. */

const ADMIN_PATH = "/admin";
const AUTOMATIONS_PATH = "/admin/automacoes";

function firstFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function saveAutomation(
  _previous: AutomationFormState | undefined,
  formData: FormData,
): Promise<AutomationFormState> {
  await requireAdmin();

  const account = await getActiveAccount();
  if (!account) {
    return {
      error: "Conecte uma conta do Instagram antes de criar automações.",
    };
  }

  const parsed = automationSchema.safeParse(readAutomationForm(formData));
  if (!parsed.success) {
    return {
      fieldErrors: firstFieldErrors(parsed.error.issues),
      error: "Revise os campos destacados.",
    };
  }

  const columns = automationColumns(parsed.data);
  const db = getDb();
  const id = readText(formData, "id").trim();

  if (id) {
    const updated = await db
      .update(automations)
      .set({ ...columns, updatedAt: new Date() })
      .where(and(eq(automations.id, id), eq(automations.accountId, account.id)))
      .returning({ id: automations.id });

    if (updated.length === 0) {
      return { error: "Automação não encontrada." };
    }
  } else {
    await db.insert(automations).values({ accountId: account.id, ...columns });
  }

  revalidatePath(AUTOMATIONS_PATH);
  revalidatePath(ADMIN_PATH);
  redirect("/admin/automacoes?ok=1");
}

export async function toggleAutomation(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = readText(formData, "id");
  const activate = formData.get("activate") === "1";
  if (!id) return;

  const db = getDb();
  await db
    .update(automations)
    .set({ isActive: activate, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath(AUTOMATIONS_PATH);
  revalidatePath(ADMIN_PATH);
}
