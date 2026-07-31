"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Empresa } from "@/lib/api";
import { AgendamentoForm } from "./AgendamentoForm";

export function NovaPostagemButton({ empresas }: { empresas: Empresa[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={empresas.length === 0}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        <Plus size={16} />
        Nova Postagem
      </button>

      {aberto && <AgendamentoForm empresas={empresas} onClose={() => setAberto(false)} />}
    </div>
  );
}
