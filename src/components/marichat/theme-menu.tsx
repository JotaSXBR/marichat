"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export const THEME_STORAGE_KEY = "marichat-theme";

export type Theme = "system" | "light" | "dark";

const THEMES: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "Sistema", icon: MonitorIcon },
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
];

/**
 * Roda antes da primeira pintura: evita o flash de tema errado. O padrão é
 * `system`; a escolha manual fica no localStorage.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** O sistema operacional também é uma fonte de mudança, não só o menu. */
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => {
    applyTheme(readTheme());
    onChange();
  };
  media.addEventListener("change", onMediaChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onMediaChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

const THEME_EVENT = "marichat-theme-change";

function setTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Três estados de tema dentro do menu da conta. */
export function ThemeMenuItems() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => "system",
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        onValueChange={(value) => setTheme(value as Theme)}
        value={theme}
      >
        {THEMES.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              <Icon aria-hidden />
              {item.label}
            </DropdownMenuRadioItem>
          );
        })}
      </DropdownMenuRadioGroup>
    </>
  );
}
