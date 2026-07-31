"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { EmpresaAvatar } from "./EmpresaAvatar";
import type { Empresa } from "@/lib/api";

export function SelectFiltroEmpresa({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valorAtual = searchParams.get("empresaId") ?? "";
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selecionada = empresas.find((e) => e.id === valorAtual);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("empresaId", id);
    else params.delete("empresaId");
    router.push(`${pathname}?${params.toString()}`);
    setAberto(false);
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2 text-xs text-gray-400">
      Empresa
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
      >
        {selecionada ? (
          <>
            <EmpresaAvatar nome={selecionada.nome} logoUrl={selecionada.logoUrl} size={16} />
            {selecionada.nome}
          </>
        ) : (
          "Todas"
        )}
        <ChevronDown size={14} />
      </button>

      {aberto && (
        <div className="absolute top-full left-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-panel py-1 shadow-lg">
          <button
            type="button"
            onClick={() => escolher("")}
            className="flex w-full items-center px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-surface"
          >
            Todas
          </button>
          {empresas.map((empresa) => (
            <button
              key={empresa.id}
              type="button"
              onClick={() => escolher(empresa.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-surface"
            >
              <EmpresaAvatar nome={empresa.nome} logoUrl={empresa.logoUrl} size={18} />
              {empresa.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
