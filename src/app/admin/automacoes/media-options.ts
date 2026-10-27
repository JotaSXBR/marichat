import "server-only";

import type { Account } from "@/lib/accounts";
import { getAccountToken } from "@/lib/accounts";
import { listRecentMedia } from "@/lib/instagram/client";
import type { MediaOption } from "./form-types";

/**
 * Busca as publicações recentes na API oficial para montar o seletor.
 * Vídeos não têm `media_url` utilizável como miniatura, então preferimos
 * `thumbnail_url`; imagens usam `media_url`.
 */
export async function loadMediaOptions(
  account: Account,
  currentMediaId?: string,
): Promise<{ options: MediaOption[]; error?: string }> {
  try {
    const media = await listRecentMedia(getAccountToken(account), 25);

    const options: MediaOption[] = media.map((item) => {
      const caption = item.caption?.split("\n")[0]?.trim();
      const date = item.timestamp
        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
            new Date(item.timestamp),
          )
        : null;
      const type =
        item.mediaType === "VIDEO"
          ? "Reel/vídeo"
          : item.mediaType === "CAROUSEL_ALBUM"
            ? "Carrossel"
            : "Imagem";

      return {
        id: item.id,
        label: [caption || type, date].filter(Boolean).join(" · "),
        thumbnailUrl: item.thumbnailUrl ?? item.mediaUrl,
        permalink: item.permalink,
      };
    });

    if (
      currentMediaId &&
      !options.some((option) => option.id === currentMediaId)
    ) {
      options.unshift({
        id: currentMediaId,
        label: "Publicação atual desta automação",
      });
    }

    return { options };
  } catch (error) {
    return {
      options: [],
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao consultar a API do Instagram.",
    };
  }
}
