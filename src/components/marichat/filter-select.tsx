"use client";

import type { ReactNode } from "react";

/**
 * Select de filtro que aplica na hora: o formulário é GET, então a troca vira
 * uma navegação com o mesmo estado na URL.
 */
export function FilterSelect({
  id,
  name,
  defaultValue,
  className,
  children,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <select
      className={className}
      defaultValue={defaultValue}
      id={id}
      name={name}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
