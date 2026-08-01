"use client";

import { useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import type { Conteudo } from "@/lib/api";
import { ConteudoPreviewCard } from "./ConteudoPreviewCard";
import { EmpresaAvatar } from "./EmpresaAvatar";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicando: "Publicando",
  publicado: "Publicado",
  erro: "Erro",
};

function preview(texto: string | null) {
  if (!texto) return "—";
  return texto.length > 100 ? `${texto.slice(0, 100)}…` : texto;
}

export function ConteudosView({ conteudos }: { conteudos: Conteudo[] }) {
  const [visualizacao, setVisualizacao] = useState<"lista" | "cards">("lista");

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-panel p-1 w-fit">
        <button
          type="button"
          onClick={() => setVisualizacao("lista")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            visualizacao === "lista" ? "bg-surface text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <List size={14} />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setVisualizacao("cards")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            visualizacao === "cards" ? "bg-surface text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <LayoutGrid size={14} />
          Cards
        </button>
      </div>

      {visualizacao === "lista" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-gray-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Prévia</th>
                <th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {conteudos.map((conteudo) => (
                <tr key={conteudo.id} className="border-t border-border bg-surface align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(conteudo.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EmpresaAvatar
                        nome={conteudo.calendario.empresa.nome}
                        logoUrl={conteudo.calendario.empresa.logoUrl}
                        size={20}
                      />
                      {conteudo.calendario.empresa.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3">{conteudo.calendario.tipoPost}</td>
                  <td className="px-4 py-3 text-gray-300">{preview(conteudo.texto)}</td>
                  <td className="px-4 py-3">v{conteudo.versao}</td>
                  <td className="px-4 py-3">
                    {STATUS_LABEL[conteudo.calendario.status] ?? conteudo.calendario.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {conteudos.map((conteudo) => (
            <ConteudoPreviewCard key={conteudo.id} conteudo={conteudo} />
          ))}
        </div>
      )}
    </div>
  );
}
