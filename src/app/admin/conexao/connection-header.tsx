type Props = {
  isZernio: boolean;
};

/** Título e indicação do transporte ativo. */
export function ConnectionHeader({ isZernio }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Conexão com o Instagram</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {isZernio
          ? "A conexão passa pela Zernio, que já tem um app aprovado pela Meta. O MARICHAT nunca vê sua senha do Instagram."
          : "A conexão usa o login oficial da Meta. O MARICHAT nunca vê sua senha do Instagram."}
      </p>
      <p className="mt-2 inline-block rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
        Transporte ativo:{" "}
        <strong>{isZernio ? "Zernio" : "Meta (direto)"}</strong> — definido por{" "}
        <code>MESSAGING_PROVIDER</code>
      </p>
    </div>
  );
}
