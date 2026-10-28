import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Portão do DESIGN.md: os tokens são a única fonte de cor (§5) e o contraste
 * da tabela §5.2 precisa continuar valendo nos dois temas. Roda sem navegador:
 * calcula o mesmo que o axe mediria no fundo real.
 */

const srcDir = path.join(process.cwd(), "src");
const tokensCss = readFileSync(
  path.join(srcDir, "styles", "tokens.css"),
  "utf8",
);

type Rgb = [number, number, number];

const lightBlock = /:root\s*\{([\s\S]*?)\}/.exec(tokensCss)?.[1] ?? "";
const darkBlock = /\.dark\s*\{([\s\S]*?)\}/.exec(tokensCss)?.[1] ?? "";

function token(name: string, block: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
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

type Pair = { label: string; fg: string; bg: string; min: number };

const pairs: Pair[] = [
  { label: "foreground no canvas", fg: "foreground", bg: "background", min: 7 },
  { label: "foreground no card", fg: "foreground", bg: "card", min: 7 },
  {
    label: "card-foreground no card",
    fg: "card-foreground",
    bg: "card",
    min: 7,
  },
  {
    label: "muted-foreground no canvas",
    fg: "muted-foreground",
    bg: "background",
    min: 4.5,
  },
  {
    label: "muted-foreground no card",
    fg: "muted-foreground",
    bg: "card",
    min: 4.5,
  },
  {
    label: "text-muted no canvas",
    fg: "text-muted",
    bg: "background",
    min: 4.5,
  },
  { label: "text-muted no card", fg: "text-muted", bg: "card", min: 4.5 },
  { label: "primary no canvas", fg: "primary", bg: "background", min: 4.5 },
  {
    label: "primary-foreground no primary",
    fg: "primary-foreground",
    bg: "primary",
    min: 4.5,
  },
  { label: "success no canvas", fg: "success", bg: "background", min: 4.5 },
  { label: "success no card", fg: "success", bg: "card", min: 4.5 },
  { label: "warning no canvas", fg: "warning", bg: "background", min: 4.5 },
  { label: "warning no card", fg: "warning", bg: "card", min: 4.5 },
  { label: "danger no canvas", fg: "danger", bg: "background", min: 4.5 },
  { label: "danger no card", fg: "danger", bg: "card", min: 4.5 },
  { label: "info no canvas", fg: "info", bg: "background", min: 4.5 },
  { label: "info no card", fg: "info", bg: "card", min: 4.5 },
  { label: "input no canvas (borda)", fg: "input", bg: "background", min: 3 },
  { label: "input no card (borda)", fg: "input", bg: "card", min: 3 },
  { label: "ring no canvas (foco)", fg: "ring", bg: "background", min: 3 },
];

const themes = [
  { name: "claro", block: lightBlock },
  { name: "escuro", block: darkBlock },
];

const stateColors = ["success", "warning", "danger", "info"];

const tintCases = themes.flatMap((theme) =>
  stateColors.map((name) => ({ name, theme: theme.name, block: theme.block })),
);

describe("tokens de cor (DESIGN.md §5.2)", () => {
  it.each(themes)("o tema $name define os slots", ({ block }) => {
    expect(token("background", block)).toBeTruthy();
    expect(token("foreground", block)).toBeTruthy();
    expect(token("card", block)).toBeTruthy();
  });

  it.each(
    themes.flatMap((theme) =>
      pairs.map((pair) => ({ ...pair, theme: theme.name, block: theme.block })),
    ),
  )("$theme: $label ≥ $min:1", ({ fg, bg, block, min }) => {
    const measured = contrast(
      parseColor(token(fg, block)).rgb,
      composite(parseColor(token(bg, block)), [255, 255, 255]),
    );
    expect(measured).toBeGreaterThanOrEqual(min);
  });

  // Chips e alertas pintam o texto de estado sobre 12% da mesma cor no fundo.
  it.each(tintCases)(
    "$theme: $name sobre o próprio tint ≥ 4.5:1",
    ({ name, theme, block }) => {
      const color = parseColor(token(name, block)).rgb;
      for (const surface of ["background", "card"]) {
        const canvas = parseColor(token(surface, block)).rgb;
        const tint = composite({ rgb: color, alpha: 0.12 }, canvas);
        expect(
          contrast(color, tint),
          `${theme}: ${name} no ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
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
