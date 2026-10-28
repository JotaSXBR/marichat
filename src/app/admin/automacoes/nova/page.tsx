import Link from "next/link";
import { connection } from "next/server";
import { PlugZapIcon } from "lucide-react";

import { AutomationEditor } from "@/app/admin/automacoes/automation-editor";
import { loadMediaOptions } from "@/app/admin/automacoes/media-options";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/marichat/page-header";

export const instant = false;

export default async function NewAutomationPage() {
  await connection();
  await requireAdmin();

  const account = await getActiveAccount();
  const media = account ? await loadMediaOptions(account) : null;

  if (!account || !media) {
    return (
      <div className="space-y-6">
        <PageHeader title="Nova automação" />
        <Alert variant="warning">
          <PlugZapIcon aria-hidden />
          <AlertTitle>Conecte o Instagram primeiro</AlertTitle>
          <AlertDescription>
            Sem conta conectada não é possível criar automações.{" "}
            <Link className="font-medium text-current" href="/admin/conexao">
              Ir para Conexão
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AutomationEditor
      mediaOptions={media.options}
      {...(media.error ? { mediaError: media.error } : {})}
    />
  );
}
