"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EmpresaForm } from "./EmpresaForm";

export function NovaEmpresaButton() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
      >
        <Plus size={16} />
        Nova Empresa
      </button>

      {aberto && <EmpresaForm onClose={() => setAberto(false)} />}
    </div>
  );
}
