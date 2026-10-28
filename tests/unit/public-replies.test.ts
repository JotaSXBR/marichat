import { describe, expect, it } from "vitest";

import { parsePublicReplies, pickPublicReply } from "@/lib/public-replies";

describe("parsePublicReplies", () => {
  it("separa por linha e descarta as vazias", () => {
    expect(parsePublicReplies(" a \n\nb\n  \nc ")).toEqual(["a", "b", "c"]);
  });

  it("trata vazio e nulo como lista vazia", () => {
    expect(parsePublicReplies("")).toEqual([]);
    expect(parsePublicReplies(null)).toEqual([]);
  });
});

describe("pickPublicReply", () => {
  it("devolve null quando não há respostas", () => {
    expect(pickPublicReply("")).toBeNull();
  });

  it("sorteia dentro da lista", () => {
    const frases = "um\ndois\ntrês";
    expect(pickPublicReply(frases, () => 0)).toBe("um");
    expect(pickPublicReply(frases, () => 0.99)).toBe("três");
  });

  it("não devolve undefined se o random chegar a 1", () => {
    expect(pickPublicReply("um\ndois\ntrês", () => 1)).toBe("três");
  });
});
