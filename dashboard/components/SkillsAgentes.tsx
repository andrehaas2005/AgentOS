"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getAgentesDefinicoes, type AgenteDefinicao } from "@/lib/api";

function LinhaSkill({ definicao }: { definicao: AgenteDefinicao }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-lg bg-surface">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{definicao.nome}</p>
          <p className="truncate text-xs text-gray-500">{definicao.descricao}</p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      {aberto && (
        <div className="border-t border-border px-3 py-2.5">
          {definicao.prompt ? (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-300">
              {definicao.prompt}
            </pre>
          ) : (
            <p className="text-xs text-gray-500">{definicao.descricao}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SkillsAgentes() {
  const [definicoes, setDefinicoes] = useState<AgenteDefinicao[]>([]);

  useEffect(() => {
    getAgentesDefinicoes().then(setDefinicoes);
  }, []);

  if (definicoes.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Skills dos agentes</h2>
      <p className="mb-4 text-xs text-gray-500">
        O prompt/instrução que cada agente segue. Clique num agente pra ver o texto completo.
      </p>
      <div className="flex flex-col gap-2">
        {definicoes.map((definicao) => (
          <LinhaSkill key={definicao.nome} definicao={definicao} />
        ))}
      </div>
    </div>
  );
}
