import "server-only";

import type { Account } from "@/lib/accounts";
import { getAccountToken } from "@/lib/accounts";
import { listRecentMedia } from "@/lib/instagram/client";
import { listAccountPosts } from "@/lib/zernio/client";
import type { MediaOption } from "./form-types";

/**
 * Busca as publicações recentes para montar o seletor.
 *
 * Cada provedor tem o seu caminho: a Meta entrega `media_url`/`thumbnail_url`
 * para o token da conta; a Zernio entrega os posts da plataforma em
 * `/v1/accounts/{id}/posts` (o token dela fica só com a Zernio). Vídeos não têm
 * `media_url` utilizável como miniatura, então preferimos a miniatura.
 */

type RawMedia = {
  id: string;
  caption?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
};

async function fetchMedia(account: Account): Promise<RawMedia[]> {
  if (account.provider === "zernio") {
    if (!account.providerAccountId) {
      throw new Error(
        "A conta da Zernio não tem identificador salvo. Reconecte em Conexão.",
      );
    }
    const posts = await listAccountPosts(account.providerAccountId);
    return posts.map((post) => ({
      id: post.id,
      caption: post.caption,
      mediaType: post.mediaType,
      thumbnailUrl: post.picture,
      permalink: post.permalink,
      timestamp: post.createdTime,
    }));
  }

  const media = await listRecentMedia(getAccountToken(account), 25);
  return media.map((item) => ({
    id: item.id,
    caption: item.caption,
    mediaType: item.mediaType,
    thumbnailUrl: item.thumbnailUrl ?? item.mediaUrl,
    permalink: item.permalink,
    timestamp: item.timestamp,
  }));
}

function toOptions(media: RawMedia[], currentMediaId?: string): MediaOption[] {
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
      thumbnailUrl: item.thumbnailUrl,
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

  return options;
}

export async function loadMediaOptions(
  account: Account,
  currentMediaId?: string,
): Promise<{ options: MediaOption[]; error?: string }> {
  try {
    return { options: toOptions(await fetchMedia(account), currentMediaId) };
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
