import {
  testInstagramConnection,
  testZernioConnection,
} from "@/app/admin/conexao/actions";
import { PageHeader } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";

type Props = {
  isZernio: boolean;
  canTest: boolean;
};

/** R2: título, transporte ativo e a ação de teste onde ela pertence. */
export function ConnectionHeader({ isZernio, canTest }: Props) {
  return (
    <PageHeader
      action={
        canTest ? (
          <form
            action={isZernio ? testZernioConnection : testInstagramConnection}
          >
            <Button size="lg" type="submit">
              Testar conexão
            </Button>
          </form>
        ) : undefined
      }
      meta={`transporte: ${isZernio ? "zernio" : "meta"}`}
      title="Conexão"
    />
  );
}
