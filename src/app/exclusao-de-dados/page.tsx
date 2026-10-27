import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { connection } from "next/server";

import {
  DeletionContent,
  DeletionLookupSection,
  DeletionRequestNotFound,
  type DeletionLookup,
} from "@/app/exclusao-de-dados/content";
import { getDb } from "@/lib/db/client";
import { dataDeletionRequests } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Exclusão de dados — MARICHAT",
  description: "Como pedir a exclusão dos seus dados no MARICHAT.",
};

// A consulta do código acontece a cada acesso, no banco.
export const instant = false;

async function findLookup(code: string): Promise<DeletionLookup | null> {
  if (!/^[a-f0-9]{32}$/i.test(code)) return null;

  const db = getDb();
  const [row] = await db
    .select({
      status: dataDeletionRequests.status,
      requestedAt: dataDeletionRequests.requestedAt,
      completedAt: dataDeletionRequests.completedAt,
    })
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.confirmationCode, code))
    .limit(1);
  return row ?? null;
}

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();

  const params = await searchParams;
  const rawCode = Array.isArray(params.codigo)
    ? params.codigo[0]
    : params.codigo;
  const code = rawCode?.trim() ?? "";
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();
  const lookup = code ? await findLookup(code) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-foreground">
      <h1 className="text-display">Exclusão de dados</h1>
      <p className="mt-2 text-body leading-6 text-card-foreground">
        Você pode solicitar a exclusão dos dados tratados pelo MARICHAT a
        qualquer momento. Apagamos o identificador do Instagram, os comentários
        e as mensagens registradas para atendimento.
      </p>

      {code ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-title text-foreground">Consulta do pedido</h2>
          {lookup ? (
            <DeletionLookupSection lookup={lookup} />
          ) : (
            <DeletionRequestNotFound />
          )}
        </section>
      ) : null}

      <DeletionContent contactEmail={contactEmail} />
    </div>
  );
}
