import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Portão do DESIGN.md: os tokens são a única fonte de cor (§5) e o contraste
 * da tabela §5.2 precisa continuar valendo. Roda sem navegador: calcula o
 * mesmo que o axe mediria no fundo real.
 */

const srcDir = path.join(process.cwd(), "src");
const tokensCss = readFileSync(
  path.join(srcDir, "styles", "tokens.css"),
  "utf8",
);

type Rgb = [number, number, number];

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokensCss);
  if (!match?.[1]) throw new Error(`token --${name} não encontrado`);
  return match[1].trim();
}

function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const digits = hex[1];
    return {
      rgb: [0, 2, 4].map((i) =>
        Number.parseInt(digits.slice(i, i + 2), 16),
      ) as Rgb,
      alpha: 1,
    };
  }

  const rgba = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/.exec(
    value,
  );
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: Number(rgba[4]),
    };
  }

  throw new Error(`cor não reconhecida: ${value}`);
}

function composite(
  foreground: { rgb: Rgb; alpha: number },
  background: Rgb,
): Rgb {
  return foreground.rgb.map((channel, index) =>
    Math.round(
      channel * foreground.alpha + background[index] * (1 - foreground.alpha),
    ),
  ) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const canvas = parseColor(token("background")).rgb;
const glass = composite(parseColor(token("card")), canvas);

type Pair = {
  label: string;
  fg: string;
  bg: "canvas" | "glass" | "primary";
  expected: number;
  min: number;
};

const backgrounds = {
  canvas,
  glass,
  primary: parseColor(token("primary")).rgb,
};

const pairs: Pair[] = [
  {
    label: "foreground no canvas",
    fg: "foreground",
    bg: "canvas",
    expected: 19.06,
    min: 7,
  },
  {
    label: "foreground no vidro",
    fg: "foreground",
    bg: "glass",
    expected: 17.78,
    min: 7,
  },
  {
    label: "card-foreground no canvas",
    fg: "card-foreground",
    bg: "canvas",
    expected: 13.46,
    min: 7,
  },
  {
    label: "card-foreground no vidro",
    fg: "card-foreground",
    bg: "glass",
    expected: 12.56,
    min: 7,
  },
  {
    label: "muted-foreground no canvas",
    fg: "muted-foreground",
    bg: "canvas",
    expected: 7.76,
    min: 4.5,
  },
  {
    label: "muted-foreground no vidro",
    fg: "muted-foreground",
    bg: "glass",
    expected: 7.24,
    min: 4.5,
  },
  {
    label: "text-muted no canvas",
    fg: "text-muted",
    bg: "canvas",
    expected: 5.81,
    min: 4.5,
  },
  {
    label: "text-muted no vidro",
    fg: "text-muted",
    bg: "glass",
    expected: 5.42,
    min: 4.5,
  },
  {
    label: "primary no canvas",
    fg: "primary",
    bg: "canvas",
    expected: 13.19,
    min: 4.5,
  },
  {
    label: "primary no vidro",
    fg: "primary",
    bg: "glass",
    expected: 12.31,
    min: 4.5,
  },
  {
    label: "primary-foreground no primary",
    fg: "primary-foreground",
    bg: "primary",
    expected: 13.13,
    min: 4.5,
  },
  {
    label: "success no canvas",
    fg: "success",
    bg: "canvas",
    expected: 10.35,
    min: 4.5,
  },
  {
    label: "success no vidro",
    fg: "success",
    bg: "glass",
    expected: 9.65,
    min: 4.5,
  },
  {
    label: "warning no canvas",
    fg: "warning",
    bg: "canvas",
    expected: 11.92,
    min: 4.5,
  },
  {
    label: "warning no vidro",
    fg: "warning",
    bg: "glass",
    expected: 11.12,
    min: 4.5,
  },
  {
    label: "danger no canvas",
    fg: "danger",
    bg: "canvas",
    expected: 7.19,
    min: 4.5,
  },
  {
    label: "danger no vidro",
    fg: "danger",
    bg: "glass",
    expected: 6.71,
    min: 4.5,
  },
  {
    label: "info no canvas",
    fg: "info",
    bg: "canvas",
    expected: 7.83,
    min: 4.5,
  },
  { label: "info no vidro", fg: "info", bg: "glass", expected: 7.3, min: 4.5 },
  {
    label: "input no canvas (borda)",
    fg: "input",
    bg: "canvas",
    expected: 3.49,
    min: 3,
  },
  {
    label: "input no vidro (borda)",
    fg: "input",
    bg: "glass",
    expected: 3.26,
    min: 3,
  },
  {
    label: "ring no canvas (foco)",
    fg: "ring",
    bg: "canvas",
    expected: 13.19,
    min: 3,
  },
];

describe("tokens de cor (DESIGN.md §5.2)", () => {
  it.each(pairs)(
    "$label fica em $expected:1",
    ({ label, fg, bg, expected, min }) => {
      const measured = contrast(parseColor(token(fg)).rgb, backgrounds[bg]);
      expect(measured, label).toBeGreaterThanOrEqual(min);
      expect(Math.abs(measured - expected), label).toBeLessThan(0.05);
    },
  );

  it("não usa a cor reprovada como texto", () => {
    expect(tokensCss.toLowerCase()).not.toContain("#71717a");
  });
});

/* ------------------------------------------------------------------ §5.1 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const bannedClasses = [
  { hint: "zinc-*", pattern: /\bzinc-\d{2,3}\b/ },
  { hint: "emerald-*", pattern: /\bemerald-\d{2,3}\b/ },
  { hint: "orange-*", pattern: /\borange-\d{2,3}\b/ },
  { hint: "bg-white", pattern: /\bbg-white\b/ },
  { hint: "text-red-*", pattern: /\btext-red-\d{2,3}\b/ },
  { hint: "text-green-*", pattern: /\btext-green-\d{2,3}\b/ },
  { hint: "text-amber-*", pattern: /\btext-amber-\d{2,3}\b/ },
];

describe("cores no código (§5.1)", () => {
  it("só usa tokens e utilitários do tema", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(srcDir)) {
      const content = readFileSync(file, "utf8");
      const relative = path.relative(srcDir, file);
      for (const { hint, pattern } of bannedClasses) {
        if (pattern.test(content)) offenders.push(`${relative}: ${hint}`);
      }
      const hex = /#[0-9a-fA-F]{6}\b/.exec(content);
      if (hex) offenders.push(`${relative}: cor crua ${hex[0]}`);
    }

    expect(offenders).toEqual([]);
  });
});
