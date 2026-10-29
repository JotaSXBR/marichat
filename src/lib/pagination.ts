/**
 * Leitura do `?limite=` cumulativo ("Carregar mais"). O fallback é o tamanho
 * inicial da lista; valores menores não encolhem a tela por link.
 */
export function readLimit(
  value: string | string[] | undefined,
  fallback: number,
  max: number,
): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < fallback) return fallback;
  return Math.min(parsed, max);
}
