import type { Metadata } from "next";
import { connection } from "next/server";

import { PrivacyContent } from "@/app/privacidade/content";

export const metadata: Metadata = {
  title: "Política de Privacidade — MARICHAT",
  description:
    "Como o MARICHAT trata dados de comentários e mensagens do Instagram.",
};

// O e-mail de contato é lido do ambiente em tempo de execução.
export const instant = false;

export default async function PrivacyPage() {
  // Lê o e-mail de contato em tempo de execução (não no build).
  await connection();
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-foreground">
      <h1 className="text-display">Política de Privacidade</h1>
      <p className="mt-2 text-label text-muted-foreground">
        Última atualização: outubro de 2026
      </p>
      <PrivacyContent contactEmail={contactEmail} />
    </div>
  );
}
