/**
 * Textos padrão da automação.
 *
 * Ficam num módulo sem dependências porque são usados dos dois lados:
 * no formulário (client component) e na leitura do formulário (server).
 * Se mudarem aqui, mudam nos dois lugares.
 */
export const DEFAULT_FOLLOW_GATE_TEXT =
  'Para liberar o link, siga o perfil e depois toque em "Já segui". Se preferir, toque em "Seguir agora".';

export const DEFAULT_FOLLOW_OPTIONAL_TEXT =
  "Se quiser receber as próximas mensagens na caixa principal, siga o perfil. O link já está aqui:";

export const DEFAULT_FOLLOW_DIRECT_TEXT =
  "Aqui está o link. Se seguir o perfil, as próximas mensagens chegam na caixa principal.";

export const DEFAULT_FOLLOW_LABEL = "Seguir agora";

export const DEFAULT_CONFIRM_LABEL = "Já segui";
