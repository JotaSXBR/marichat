import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeScript } from "@/components/marichat/theme-menu";
import "./globals.css";

// v7: IBM Plex Sans na interface e nos títulos; Plex Mono em dado técnico.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MARICHAT",
  description:
    "Automação de comentários e mensagens privadas do Instagram para o perfil profissional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      lang="pt-BR"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
