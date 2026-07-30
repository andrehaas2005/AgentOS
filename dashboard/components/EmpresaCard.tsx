"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Empresa } from "@/lib/api";
import { EmpresaForm } from "./EmpresaForm";
import { EmpresaAvatar } from "./EmpresaAvatar";

export function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const [editando, setEditando] = useState(false);
  const contasSociais = empresa.contasSociais ?? [];
  const conectadas = contasSociais.filter((c) => c.status === "conectado").length;
  const total = contasSociais.length || 1;
  const progresso = Math.round((conectadas / total) * 100);

  return (
    <div className="relative min-w-[220px] flex-1 rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <EmpresaAvatar nome={empresa.nome} logoUrl={empresa.logoUrl} size={28} />
          <h3 className="min-w-0 flex-1 truncate font-medium text-white">{empresa.nome}</h3>
        </div>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-surface hover:text-white"
          title="Editar empresa"
        >
          <Pencil size={14} />
        </button>
      </div>
      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-surface px-2 py-0.5 text-xs text-gray-300">
        {empresa.nicho ?? "sem nicho"}
      </span>
      <p className="mt-3 text-xs text-gray-400">Contas conectadas</p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${progresso}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{conectadas} de {contasSociais.length} redes</p>

      {editando && <EmpresaForm empresa={empresa} onClose={() => setEditando(false)} />}
    </div>
  );
}
