/** Conteúdo e blocos da página de exclusão de dados. */

export type DeletionLookup = {
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
};

function format(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export function DeletionLookupSection({ lookup }: { lookup: DeletionLookup }) {
  return (
    <dl className="mt-2 space-y-1 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Situação</dt>
        <dd className="font-medium">
          {lookup.status === "completed" ? "Concluído" : lookup.status}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Solicitado em</dt>
        <dd>{format(lookup.requestedAt)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Concluído em</dt>
        <dd>{lookup.completedAt ? format(lookup.completedAt) : "—"}</dd>
      </div>
    </dl>
  );
}

export function DeletionRequestNotFound() {
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      Não encontramos um pedido com esse código.
    </p>
  );
}

function DeletionSteps({ contactEmail }: { contactEmail?: string }) {
  return (
    <div>
      <h2 className="text-section">Como pedir a exclusão</h2>
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
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>{" "}
            com o pedido.
          </li>
        ) : null}
      </ol>
    </div>
  );
}

function AfterRequestSections() {
  return (
    <>
      <div>
        <h2 className="text-section">O que acontece depois</h2>
        <p className="mt-2">
          Confirmamos o recebimento e apagamos os dados em até 15 dias. O
          resultado fica registrado apenas como código de confirmação e data,
          sem guardar o identificador original em texto legível. Alguns
          registros podem ser mantidos pelo prazo legal aplicável ou para
          comprovar o atendimento do pedido.
        </p>
      </div>

      <div>
        <h2 className="text-section">Dados na Meta</h2>
        <p className="mt-2">
          A exclusão no MARICHAT não apaga o conteúdo que está no Instagram.
          Para isso, use as ferramentas do próprio Instagram (por exemplo,
          apagar o comentário ou a conversa).
        </p>
      </div>

      <p>
        Veja também a{" "}
        <a
          className="text-primary underline underline-offset-4"
          href="/privacidade"
        >
          Política de Privacidade
        </a>
        .
      </p>
    </>
  );
}

export function DeletionContent({ contactEmail }: { contactEmail?: string }) {
  return (
    <section className="mt-8 space-y-6 text-body leading-6 text-card-foreground">
      <DeletionSteps contactEmail={contactEmail} />
      <AfterRequestSections />
    </section>
  );
}
