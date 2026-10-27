import Link from "next/link";
import { CheckCircle2Icon, PlugZapIcon, WorkflowIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export function EmptyAutomations() {
  return (
    <Card className="items-center gap-4 py-12 text-center" variant="empty">
      <WorkflowIcon aria-hidden className="size-6 text-muted-soft" />
      <div>
        <p className="text-title text-foreground">Nenhuma automação ainda</p>
        <p className="mt-1 text-label text-muted-foreground">
          A primeira leva menos de dois minutos.
        </p>
      </div>
      <Button asChild>
        <Link href="/admin/automacoes/nova">Criar automação</Link>
      </Button>
    </Card>
  );
}
