"use client";

import { useTransition } from "react";

import { toggleAutomation } from "@/app/admin/actions";
import { Switch } from "@/components/ui/switch";

/** Liga/desliga do card (§9.2). A ação é a mesma Server Action do formulário. */
export function AutomationToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      aria-label={isActive ? "Desativar automação" : "Ativar automação"}
      checked={isActive}
      disabled={pending}
      onCheckedChange={(checked) => {
        const data = new FormData();
        data.set("id", id);
        data.set("activate", checked ? "1" : "0");
        startTransition(() => {
          void toggleAutomation(data);
        });
      }}
    />
  );
}
