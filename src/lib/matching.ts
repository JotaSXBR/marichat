/**
 * Normalização e correspondência de palavras-chave.
 *
 * Regras:
 * - maiúsculas/minúsculas e acentos não importam;
 * - menções @ são ignoradas;
 * - a palavra/frase precisa aparecer com limites de palavra
 *   ("LINK!" corresponde a "link"; "linktree" não corresponde).
 */

export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeKeyword(input: string): string {
  // Mesma forma usada na comparação: sem acentos, pontuação ou menções.
  return normalizeText(stripMentions(input))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripMentions(text: string): string {
  return text.replace(/(^|\s)@[a-z0-9._]+/gi, " ");
}

function toWordStream(text: string): string {
  return normalizeText(stripMentions(text))
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function commentMatchesKeyword(
  commentText: string | null | undefined,
  keyword: string,
): boolean {
  if (!commentText) return false;
  const haystack = toWordStream(commentText);
  const needle = toWordStream(keyword);
  if (!needle || !haystack) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

export type AutomationCandidate = {
  id: string;
  mediaId: string | null;
  createdAt: Date;
};

/**
 * Escolhe uma automação entre as que deram match:
 * 1) publicação específica vence qualquer publicação;
 * 2) empate: vence a automação mais antiga.
 */
export function pickAutomation<T extends AutomationCandidate>(
  candidates: T[],
  commentMediaId: string,
): T | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const aSpecific = a.mediaId === commentMediaId ? 1 : 0;
    const bSpecific = b.mediaId === commentMediaId ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0]!;
}
