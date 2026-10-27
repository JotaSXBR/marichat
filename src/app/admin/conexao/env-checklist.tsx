import type { EnvRequirement } from "@/app/admin/conexao/connection-utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

type Props = {
  requirements: readonly EnvRequirement[];
};

/** Checklist de variáveis, mostrando só presença (nunca o valor). */
export function EnvChecklist({ requirements }: Props) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Variáveis de ambiente</CardTitle>
        <CardDescription>
          Só a presença aparece aqui; os valores nunca são exibidos. Altere no
          Coolify e reinicie a aplicação.
        </CardDescription>
      </CardHeader>

      <ul className="grid gap-2 sm:grid-cols-2">
        {requirements.map(([name, description]) => {
          const present = Boolean(process.env[name]?.trim());
          return (
            <li
              key={name}
              className="flex items-start justify-between gap-3 rounded-md border border-line-subtle px-3 py-2"
            >
              <span className="min-w-0">
                <code className="block truncate font-mono text-mono text-foreground">
                  {name}
                </code>
                <span className="block text-label text-muted-foreground">
                  {description}
                </span>
              </span>
              <StatusChip tone={present ? "success" : "danger"}>
                {present ? "ok" : "faltando"}
              </StatusChip>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
