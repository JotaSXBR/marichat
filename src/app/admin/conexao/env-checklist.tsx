import type { EnvRequirement } from "@/app/admin/conexao/connection-utils";
import { StatusChip } from "@/components/ui/status-chip";

type Props = {
  requirements: readonly EnvRequirement[];
};

/** Checklist de variáveis, mostrando só presença (nunca o valor). */
export function EnvChecklist({ requirements }: Props) {
  return (
    <section className="border-b border-border py-4">
      <h2 className="text-[0.875rem] font-semibold text-foreground">
        Variáveis de ambiente
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-5 text-muted-soft">
        Só a presença aparece aqui; os valores nunca são exibidos. Altere no
        Coolify e reinicie a aplicação.
      </p>

      <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
        {requirements.map(([name, description]) => {
          const present = Boolean(process.env[name]?.trim());
          return (
            <li
              key={name}
              className="flex items-start justify-between gap-3 border-b border-line-subtle py-2.5"
            >
              <span className="min-w-0">
                <code className="block truncate font-mono text-[0.8125rem] text-foreground">
                  {name}
                </code>
                <span className="block text-[0.75rem] leading-[1.125rem] text-muted-soft">
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
    </section>
  );
}
