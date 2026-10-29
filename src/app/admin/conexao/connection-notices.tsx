import {
  buildConnectionNotices,
  type ConnectionNoticeInput,
} from "@/app/admin/conexao/connection-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react";

const NOTICE_ICONS = {
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  danger: TriangleAlertIcon,
  info: InfoIcon,
};

/** R3: resultado da última operação (conectar, testar, desconectar). */
export function ConnectionNotices(props: ConnectionNoticeInput) {
  const notices = buildConnectionNotices(props);
  if (notices.length === 0) return null;

  return (
    <section aria-label="Avisos" className="grid gap-3">
      {notices.map((notice) => {
        const Icon = NOTICE_ICONS[notice.variant];
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
