/**
 * Respostas públicas no comentário.
 *
 * Ficam numa coluna de texto com uma frase por linha: é o formato que o
 * formulário mostra e o único que precisa ser lido aqui. Sortear uma a cada
 * comentário evita que todo mundo receba a mesma frase.
 */

export const MIN_PUBLIC_REPLIES = 3;

/** Linhas não vazias, sem espaços nas pontas. */
export function parsePublicReplies(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Sorteia uma resposta. `random` existe para o teste; em produção usa
 * Math.random e não precisa ser criptográfico.
 */
export function pickPublicReply(
  value: string | null | undefined,
  random: () => number = Math.random,
): string | null {
  const replies = parsePublicReplies(value);
  if (replies.length === 0) return null;
  const index = Math.min(
    Math.floor(random() * replies.length),
    replies.length - 1,
  );
  return replies[index] ?? replies[0] ?? null;
}
