"use client";

import { useEffect, useState } from "react";
import { Maximize2, Pencil, X } from "lucide-react";
import { EscritorioAgentes } from "./EscritorioAgentes";
import { EscritorioEditor } from "./EscritorioEditor";

export function EscritorioAgentesCard() {
  const [telaCheia, setTelaCheia] = useState(false);
  const [editando, setEditando] = useState(false);
  const [chaveRecarregar, setChaveRecarregar] = useState(0);

  // Esc fecha a tela cheia, igual qualquer modal/overlay do painel.
  useEffect(() => {
    if (!telaCheia) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTelaCheia(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [telaCheia]);

  return (
    <>
      <div className="min-w-0 flex-1 rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Agentes em Atividade</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
              aria-label="Editar escritório"
              title="Editar escritório"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => setTelaCheia(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
              aria-label="Ver em tela cheia"
              title="Ver em tela cheia"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        <EscritorioAgentes key={chaveRecarregar} />
      </div>

      {telaCheia && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0d14] p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Agentes em Atividade</h2>
            <button
              type="button"
              onClick={() => setTelaCheia(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
              aria-label="Fechar tela cheia"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <EscritorioAgentes key={chaveRecarregar} altura="h-full" />
          </div>
        </div>
      )}

      {editando && (
        <EscritorioEditor
          onClose={() => setEditando(false)}
          onPublicado={() => {
            setEditando(false);
            setChaveRecarregar((c) => c + 1);
          }}
        />
      )}
    </>
  );
}
