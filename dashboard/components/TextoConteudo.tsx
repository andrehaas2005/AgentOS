"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { atualizarConteudo } from "@/lib/api";

export function TextoConteudo({ id, texto }: { id: string; texto: string | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(texto ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const resultado = await atualizarConteudo(id, valor);
    setSalvando(false);
    if (resultado.ok) {
      setEditando(false);
      router.refresh();
    }
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          rows={6}
          className="w-full resize-y rounded-lg border border-border bg-surface p-2 text-sm text-gray-200 outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setValor(texto ?? "");
              setEditando(false);
            }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-2">
      <p className="whitespace-pre-line text-sm text-gray-200">{texto ?? "—"}</p>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="shrink-0 rounded-lg p-1 text-gray-600 opacity-0 hover:text-white group-hover:opacity-100"
        title="Editar texto"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
