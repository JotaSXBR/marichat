import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn com a escala do projeto", () => {
  it("mantém o tamanho de texto ao lado de uma cor", () => {
    expect(cn("text-micro text-muted-foreground")).toBe(
      "text-micro text-muted-foreground",
    );
    expect(cn("text-label", "text-muted-foreground")).toBe(
      "text-label text-muted-foreground",
    );
  });
});
