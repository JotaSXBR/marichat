/**
 * Leitura segura de formulários do painel.
 *
 * `FormData.get` devolve `string | File | null`. Passar isso por `String()`
 * transformaria um arquivo em `"[object File]"`, que não é o que nenhum campo
 * de texto espera. Aqui só aceitamos texto; ausente ou arquivo vira `""`.
 */
export function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
