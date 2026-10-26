import type { Metadata } from "next";
import { connection } from "next/server";

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
    <div className="mx-auto max-w-3xl px-4 py-10 text-zinc-800">
      <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Última atualização: outubro de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6">
        <section>
          <h2 className="text-base font-semibold">1. Quem somos</h2>
          <p className="mt-2">
            O MARICHAT é uma ferramenta de atendimento automático usada pelo
            perfil profissional do Instagram que publicou o conteúdo em que você
            comentou. Quando você comenta uma palavra-chave, o sistema envia uma
            mensagem privada com o material solicitado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Quais dados tratamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>identificador do Instagram de quem comentou (IGSID);</li>
            <li>texto do comentário e identificador da publicação;</li>
            <li>
              conteúdo das mensagens trocadas com o perfil, incluindo sua resposta
              na DM e a confirmação de que segue o perfil (quando essa opção
              estiver ligada);
            </li>
            <li>identificadores técnicos e datas dos eventos da Meta.</li>
          </ul>
          <p className="mt-2">
            Não recebemos nem armazenamos sua senha do Instagram, seu e-mail ou
            seu telefone.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Para que usamos</h2>
          <p className="mt-2">
            Exclusivamente para responder ao seu comentário e enviar o link
            solicitado, garantir a segurança e o funcionamento do serviço,
            prevenir abusos e cumprir obrigações legais. Não usamos os dados para
            publicidade nem os vendemos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Base legal</h2>
          <p className="mt-2">
            Tratamos os dados com base no seu consentimento ao interagir com o
            perfil (art. 7º, I, da LGPD) e no legítimo interesse em prestar o
            atendimento solicitado (art. 7º, IX), sempre limitado à finalidade
            acima.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Compartilhamento</h2>
          <p className="mt-2">
            Os dados transitam pela plataforma da Meta (Instagram), conforme as
            políticas dela, e ficam hospedados em servidor contratado para
            operar esta ferramenta. Não há transferência para terceiros com
            finalidade comercial.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Por quanto tempo guardamos</h2>
          <p className="mt-2">
            O conteúdo técnico dos eventos (payloads de webhook) e das mensagens
            enviadas é removido após 30 dias, mantendo-se apenas identificadores e
            situação para auditoria. O identificador usado no pedido de exclusão é
            guardado somente como hash (não reversível). O token de acesso ao
            Instagram fica cifrado e é descartado ao desconectar a conta.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Seus direitos</h2>
          <p className="mt-2">
            Você pode pedir confirmação de tratamento, acesso, correção,
            eliminação, portabilidade e informação sobre compartilhamentos, nos
            termos da LGPD. Para excluir seus dados, siga as instruções em{" "}
            <a className="underline" href="/exclusao-de-dados">
              Exclusão de dados
            </a>
            .
          </p>
          {contactEmail ? (
            <p className="mt-2">
              Contato do responsável:{" "}
              <a className="underline" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
              .
            </p>
          ) : (
            <p className="mt-2">
              Você também pode solicitar pelo Direct do perfil do Instagram que
              publicou o conteúdo.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Cookies</h2>
          <p className="mt-2">
            Usamos apenas cookies técnicos necessários: um durante o login
            oficial do Instagram (proteção contra fraude na autorização) e o
            cookie de autenticação do painel administrativo. Não há cookies de
            publicidade nem rastreamento.
          </p>
        </section>
      </div>
    </div>
  );
}
