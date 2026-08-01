"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getAgenteTimeline, type ExecucaoAgente } from "@/lib/api";
import { spriteDoAgente } from "@/lib/agentes";

function tempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  return `${h} h atrás`;
}

function resumoSaida(saida: unknown): string {
  if (!saida || typeof saida !== "object") return "—";
  const obj = saida as Record<string, unknown>;
  const estruturado = obj.estruturado as Record<string, unknown> | null | undefined;
  if (estruturado && typeof estruturado.legenda === "string") return estruturado.legenda.slice(0, 140);
  if (typeof obj.texto === "string") return obj.texto.slice(0, 140);
  if (typeof obj.resultado === "string") return obj.resultado.slice(0, 140);
  if (typeof obj.erro === "string") return obj.erro.slice(0, 140);
  return "—";
}

type Props = {
  nome: string;
  ativo: boolean;
  descricaoAtiva?: string;
  falaOciosa?: string;
  onClose: () => void;
};

export function PainelAgente({ nome, ativo, descricaoAtiva, falaOciosa, onClose }: Props) {
  const [timeline, setTimeline] = useState<ExecucaoAgente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    getAgenteTimeline(nome).then((dados) => {
      if (!cancelado) {
        setTimeline(dados);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [nome]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spriteDoAgente(nome)}
            alt={nome}
            className="h-9 w-9"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">{nome}</h3>
            <p className={`text-xs ${ativo ? "text-emerald-400" : "text-amber-400"}`}>
              {ativo ? "Trabalhando agora" : "Ocioso"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {ativo && descricaoAtiva && (
          <p className="mb-3 rounded-lg border border-border bg-surface p-2 text-xs text-gray-300">
            {descricaoAtiva}
          </p>
        )}
        {!ativo && (
          <p className="mb-3 rounded-lg border border-border bg-surface p-2 text-xs text-gray-300">
            {falaOciosa ?? "Sem diálogo no momento — só relaxando na copa."}
          </p>
        )}

        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Histórico recente
        </h4>
        {carregando ? (
          <p className="text-xs text-gray-500">Carregando...</p>
        ) : timeline.length === 0 ? (
          <p className="text-xs text-gray-500">Sem execuções recentes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timeline.map((execucao) => (
              <li key={execucao.id} className="rounded-lg border border-border bg-surface p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-medium uppercase ${
                      execucao.status === "erro" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {execucao.status}
                  </span>
                  <span className="text-[10px] text-gray-500">{tempoRelativo(execucao.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-300">{resumoSaida(execucao.saida)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
