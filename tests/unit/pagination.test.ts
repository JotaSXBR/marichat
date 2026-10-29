import { describe, expect, it } from "vitest";

import { readLimit } from "@/lib/pagination";

describe("limite cumulativo da URL", () => {
  it("usa o padrão quando o valor falta ou é menor", () => {
    expect(readLimit(undefined, 30, 300)).toBe(30);
    expect(readLimit("10", 30, 300)).toBe(30);
    expect(readLimit("abc", 30, 300)).toBe(30);
  });

  it("lê valores válidos e para no teto", () => {
    expect(readLimit("90", 30, 300)).toBe(90);
    expect(readLimit("9999", 30, 300)).toBe(300);
  });
});
