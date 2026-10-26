import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db/client";
import { dataDeletionRequests } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Exclusão de dados — MARICHAT",
  description: "Como pedir a exclusão dos seus dados no MARICHAT.",
};

// A consulta do código acontece a cada acesso, no banco.
export const instant = false;

type Lookup = {
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();

  const params = await searchParams;
  const rawCode = Array.isArray(params.codigo) ? params.codigo[0] : params.codigo;
  const code = rawCode?.trim() ?? "";
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  let lookup: Lookup | null = null;
  if (/^[a-f0-9]{32}$/i.test(code)) {
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
    lookup = row ?? null;
  }

  const format = (value: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(value);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-zinc-800">
      <h1 className="text-2xl font-semibold">Exclusão de dados</h1>
      <p className="mt-2 text-sm leading-6">
        Você pode solicitar a exclusão dos dados tratados pelo MARICHAT a qualquer
        momento. Apagamos o identificador do Instagram, os comentários e as
        mensagens registradas para atendimento.
      </p>

      {code ? (
        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Consulta do pedido</h2>
          {lookup ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Situação</dt>
                <dd className="font-medium">
                  {lookup.status === "completed" ? "Concluído" : lookup.status}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Solicitado em</dt>
                <dd>{format(lookup.requestedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Concluído em</dt>
                <dd>{lookup.completedAt ? format(lookup.completedAt) : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Não encontramos um pedido com esse código.
            </p>
          )}
        </section>
      ) : null}

      <section className="mt-8 space-y-6 text-sm leading-6">
        <div>
          <h2 className="text-base font-semibold">Como pedir a exclusão</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Envie uma mensagem privada para o perfil do Instagram que publicou o
              conteúdo, com o texto <strong>EXCLUIR MEUS DADOS</strong>.
            </li>
            <li>
              Ou use a opção de exclusão de dados disponibilizada pelo próprio
              Instagram/Meta, quando existir.
            </li>
            {contactEmail ? (
              <li>
                Ou envie um e-mail para{" "}
                <a className="underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>{" "}
                com o pedido.
              </li>
            ) : null}
          </ol>
        </div>

        <div>
          <h2 className="text-base font-semibold">O que acontece depois</h2>
          <p className="mt-2">
            Confirmamos o recebimento e apagamos os dados em até 15 dias. O
            resultado fica registrado apenas como código de confirmação e data,
            sem guardar o identificador original em texto legível. Alguns
            registros podem ser mantidos pelo prazo legal aplicável ou para
            comprovar o atendimento do pedido.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Dados na Meta</h2>
          <p className="mt-2">
            A exclusão no MARICHAT não apaga o conteúdo que está no Instagram. Para
            isso, use as ferramentas do próprio Instagram (por exemplo, apagar o
            comentário ou a conversa).
          </p>
        </div>

        <p>
          Veja também a{" "}
          <a className="underline" href="/privacidade">
            Política de Privacidade
          </a>
          .
        </p>
      </section>
    </div>
  );
}
