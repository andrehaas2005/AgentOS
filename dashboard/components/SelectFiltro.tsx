"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Opcao = { value: string; label: string };

type Props = {
  paramName: string;
  label: string;
  opcoes: Opcao[];
  placeholder?: string;
};

export function SelectFiltro({ paramName, label, opcoes, placeholder = "Todas" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valorAtual = searchParams.get(paramName) ?? "";

  function aoMudar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(paramName, valor);
    } else {
      params.delete(paramName);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-xs text-gray-400">
      {label}
      <select
        value={valorAtual}
        onChange={(e) => aoMudar(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
      >
        <option value="">{placeholder}</option>
        {opcoes.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </label>
  );
}
