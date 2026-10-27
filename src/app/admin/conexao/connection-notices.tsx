import { errorMessages } from "@/app/admin/conexao/connection-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react";

type Props = {
  ok: boolean;
  accountName?: string;
  webhookRequested: boolean;
  errorCode?: string;
  disconnected: boolean;
  tested: boolean;
};

type Notice = {
  id: string;
  variant: "success" | "warning" | "danger" | "info";
  icon: typeof InfoIcon;
  title: string;
  description: string;
};

function buildNotices({
  ok,
  accountName,
  webhookRequested,
  errorCode,
  disconnected,
  tested,
}: Props): Notice[] {
  const notices: Notice[] = [];

  if (ok) {
    notices.push({
      id: "ok",
      variant: "success",
      icon: CheckCircle2Icon,
      title: "Conta conectada com sucesso",
      description: accountName
        ? `@${accountName} já pode disparar automações.`
        : "A conta já pode disparar automações.",
    });
  }

  if (disconnected) {
    notices.push({
      id: "disconnected",
      variant: "warning",
      icon: TriangleAlertIcon,
      title: "Conta desconectada",
      description:
        "As automações ficam pausadas e nenhuma mensagem será enviada até reconectar.",
    });
  }

  if (errorCode) {
    notices.push({
      id: "error",
      variant: "danger",
      icon: TriangleAlertIcon,
      title: "Não foi possível concluir",
      description:
        errorMessages[errorCode] ?? "Não foi possível concluir a operação.",
    });
  }

  if (webhookRequested) {
    notices.push({
      id: "webhook",
      variant: "info",
      icon: InfoIcon,
      title: "Pedido de registro enviado",
      description: "Confira o resultado em Conta atual.",
    });
  }

  if (tested) {
    notices.push({
      id: "tested",
      variant: "info",
      icon: InfoIcon,
      title: "Teste concluído",
      description: "Veja o resultado em Diagnóstico da conexão.",
    });
  }

  return notices;
}

/** R3: resultado da última operação (conectar, testar, desconectar). */
export function ConnectionNotices(props: Props) {
  const notices = buildNotices(props);
  if (notices.length === 0) return null;

  return (
    <section aria-label="Avisos" className="grid gap-3">
      {notices.map((notice) => {
        const Icon = notice.icon;
        return (
          <Alert key={notice.id} variant={notice.variant}>
            <Icon aria-hidden />
            <AlertTitle>{notice.title}</AlertTitle>
            <AlertDescription>{notice.description}</AlertDescription>
          </Alert>
        );
      })}
    </section>
  );
}
