import type { EnvRequirement } from "@/app/admin/conexao/connection-utils";

type Props = {
  requirements: readonly EnvRequirement[];
};

/** Checklist de variáveis, mostrando só presença (nunca o valor). */
export function EnvChecklist({ requirements }: Props) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium">Variáveis de ambiente</h2>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {requirements.map(([name, description]) => {
          const present = Boolean(process.env[name]?.trim());
          return (
            <li key={name} className="flex items-start gap-2">
              <span
                aria-hidden
                className={present ? "text-green-600" : "text-red-600"}
              >
                {present ? "✓" : "✗"}
              </span>
              <span>
                <code className="text-xs">{name}</code>
                <span className="block text-xs text-zinc-500">
                  {description}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        Os valores nunca são exibidos aqui. Altere-os no Coolify e reinicie a
        aplicação.
      </p>
    </section>
  );
}
