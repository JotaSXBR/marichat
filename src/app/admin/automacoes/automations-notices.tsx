import Link from "next/link";
import { CheckCircle2Icon, PlugZapIcon, WorkflowIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SavedNotice() {
  return (
    <Alert variant="success">
      <CheckCircle2Icon aria-hidden />
      <AlertTitle>Automação salva</AlertTitle>
      <AlertDescription>
        A primeira DM já agendada mantém o texto antigo; os demais textos valem
        para os próximos envios.
      </AlertDescription>
    </Alert>
  );
}

export function NoAccountNotice() {
  return (
    <Alert variant="warning">
      <PlugZapIcon aria-hidden />
      <AlertTitle>Conecte o Instagram antes de criar automações</AlertTitle>
      <AlertDescription>
        <Link className="font-medium text-current" href="/admin/conexao">
          Ir para Conexão
        </Link>
      </AlertDescription>
    </Alert>
  );
}

export function NoMatchesNotice() {
  return (
    <p className="border-b border-line-subtle py-4 text-sm text-muted-foreground">
      Nenhuma automação com esse filtro.{" "}
      <Link
        className="text-foreground underline decoration-border underline-offset-[3px]"
        href="/admin/automacoes"
      >
        Limpar
      </Link>
    </p>
  );
}

export function EmptyAutomations() {
  return (
    <div className="border-b border-border py-10">
      <WorkflowIcon aria-hidden className="size-5 text-muted-soft" />
      <p className="mt-3 text-title text-foreground">Nenhuma automação ainda</p>
      <p className="mt-1 text-[0.875rem] text-muted-foreground">
        A primeira leva menos de dois minutos.
      </p>
      <Button asChild className="mt-4">
        <Link href="/admin/automacoes/nova">Criar automação</Link>
      </Button>
    </div>
  );
}
