/**
 * Modos da porta de seguidor.
 *
 * Ficam num módulo próprio porque o schema, o webhook, a fila e o formulário
 * precisam da mesma lista — e porque a decisão de produto fica documentada
 * num lugar só.
 */

export const FOLLOW_MODES = [
  "off",
  "soft",
  "locked",
  "optional",
  "direct",
] as const;

export type FollowMode = (typeof FOLLOW_MODES)[number];

export const DEFAULT_FOLLOW_MODE: FollowMode = "off";

export function isFollowMode(value: unknown): value is FollowMode {
  return (
    typeof value === "string" &&
    (FOLLOW_MODES as readonly string[]).includes(value)
  );
}

/** Modos que consultam o perfil antes de entregar o link. */
export function usesFollowCheck(
  mode: FollowMode,
): mode is "soft" | "locked" {
  return mode === "soft" || mode === "locked";
}

/** Modos que já entregam o link junto com o pedido para seguir. */
export function deliversLinkWithPrompt(
  mode: FollowMode,
): mode is "optional" | "direct" {
  return mode === "optional" || mode === "direct";
}

export const FOLLOW_MODE_LABELS: Record<
  FollowMode,
  { title: string; description: string }
> = {
  off: {
    title: "Sem porta de seguidor",
    description:
      "Assim que a pessoa responde à primeira mensagem, recebe o link.",
  },
  soft: {
    title: "Tolerante (atual)",
    description:
      "Pede para seguir e confere o perfil até 2 vezes. Se a Meta não confirmar, libera o link mesmo assim.",
  },
  locked: {
    title: "Travado para seguidor",
    description:
      "Só entrega o link quando a Meta confirma que a pessoa segue. Enquanto não confirmar, mantém o pedido.",
  },
  optional: {
    title: "Opcional (fala uma vez)",
    description:
      "Uma mensagem com dois botões: seguir o perfil e abrir o link. Sem nova checagem.",
  },
  direct: {
    title: "Direto (menos invasivo)",
    description:
      "Só o link, com um aviso de que seguir o perfil faz as próximas mensagens chegarem à caixa principal.",
  },
};
