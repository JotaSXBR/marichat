import { PageHeader } from "@/components/marichat/page-header";

type Props = {
  isZernio: boolean;
};

/** R2: título, promessa de privacidade e o transporte ativo em mono. */
export function ConnectionHeader({ isZernio }: Props) {
  return (
    <PageHeader
      description={
        isZernio
          ? "A conexão passa pela Zernio, que já tem um app aprovado pela Meta. O MARICHAT nunca vê sua senha do Instagram."
          : "A conexão usa o login oficial da Meta. O MARICHAT nunca vê sua senha do Instagram."
      }
      meta={`transporte: ${isZernio ? "zernio" : "meta"}`}
      title="Conexão com o Instagram"
    />
  );
}
