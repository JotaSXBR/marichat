import { ZernioAccountPicker } from "@/app/admin/conexao/zernio-account-picker";
import type { ZernioAccount } from "@/lib/zernio/client";
import { SectionHeading } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";
import { Link2Icon } from "lucide-react";

type Props = {
  isZernio: boolean;
  zernioAccounts: ZernioAccount[];
  zernioListError: string | null;
};

/** Estado sem conta vinculada: conectar pela Zernio ou pela Meta. */
export function EmptyAccountCard({
  isZernio,
  zernioAccounts,
  zernioListError,
}: Props) {
  return (
    <section aria-label="Conta atual" className="min-w-0">
      <SectionHeading title="Conta atual" />
      <p className="mt-3 text-[0.875rem] leading-6 text-muted-foreground">
        {isZernio
          ? "A conta do Instagram precisa estar conectada primeiro no painel da Zernio; depois escolha abaixo qual usar."
          : "Use uma conta profissional do Instagram (criador ou empresa) com acesso às mensagens. O MARICHAT nunca vê sua senha."}
      </p>

      <div className="mt-4">
        {isZernio ? (
          <ZernioAccountPicker
            accounts={zernioAccounts}
            listError={zernioListError}
          />
        ) : (
          <Button asChild size="lg">
            <a href="/api/auth/instagram/start">
              <Link2Icon aria-hidden />
              Conectar Instagram
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}
