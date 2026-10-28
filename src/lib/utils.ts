import { createCn } from "cn/config";

/**
 * O `cn` não conhece a escala `--text-*` do globals.css: sem isto ele trata
 * `text-micro` como cor e descarta o tamanho quando há `text-muted-foreground`
 * na mesma chamada.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "section",
            "title",
            "body",
            "label",
            "micro",
            "figure",
            "mono",
          ],
        },
      ],
    },
  },
});
