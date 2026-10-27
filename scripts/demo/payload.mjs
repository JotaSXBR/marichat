/**
 * Leitura defensiva das mensagens capturadas pela API simulada. Isola as
 * cadeias opcionais para manter as etapas do demo simples de ler.
 */

export function messageText(body) {
  return body?.message?.text ?? "";
}

export function hasQuickReplies(body) {
  return Boolean(body?.message?.quick_replies);
}

export function repliedCommentId(body) {
  return body?.recipient?.comment_id ?? null;
}

export function firstButton(body) {
  return body?.message?.attachment?.payload?.elements?.[0]?.buttons?.[0];
}
