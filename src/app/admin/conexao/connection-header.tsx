import { StatusChip } from "@/components/ui/status-chip";

type Props = {
  isZernio: boolean;
};

/** R2: título, promessa de privacidade e o transporte ativo. */
export function ConnectionHeader({ isZernio }: Props) {
  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-display text-foreground">Conexão com o Instagram</h1>
      <p className="text-body text-muted-foreground">
        {isZernio
          ? "A conexão passa pela Zernio, que já tem um app aprovado pela Meta. O MARICHAT nunca vê sua senha do Instagram."
          : "A conexão usa o login oficial da Meta. O MARICHAT nunca vê sua senha do Instagram."}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-label text-muted-foreground">
        Transporte ativo:
        <StatusChip tone="info">
          {isZernio ? "Zernio" : "Meta (direto)"}
        </StatusChip>
        definido por <code className="font-mono">MESSAGING_PROVIDER</code>
      </p>
    </div>
  );
}
