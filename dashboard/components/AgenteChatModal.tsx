"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import type { MensagemChat } from "@/lib/api";

// Componente de chat 100% genérico — não sabe nada sobre o que está sendo editado. Quem abre
// o modal passa só o texto/agente e uma função onEnviarTurno; qualquer chat futuro com outro
// agente reaproveita este mesmo componente.
export function AgenteChatModal({
  titulo,
  agenteNome,
  onEnviarTurno,
  onAplicado,
  onClose,
}: {
  titulo: string;
  agenteNome: string;
  onEnviarTurno: (
    mensagens: MensagemChat[],
  ) => Promise<{ ok: boolean; erro?: string; tipo?: "pergunta" | "aplicar"; pergunta?: string; resumo?: string }>;
  onAplicado: () => void;
  onClose: () => void;
}) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aplicado, setAplicado] = useState<{ resumo: string } | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  async function enviarTurno(historico: MensagemChat[]) {
    setCarregando(true);
    setErro(null);
    const resultado = await onEnviarTurno(historico);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível continuar a conversa.");
      return;
    }
    if (resultado.tipo === "aplicar") {
      setAplicado({ resumo: resultado.resumo ?? "Mudanças aplicadas." });
      return;
    }
    setMensagens([...historico, { role: "assistant", content: resultado.pergunta ?? "" }]);
  }

  useEffect(() => {
    enviarTurno([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aplicado]);

  function enviar() {
    if (!texto.trim() || carregando) return;
    const novoHistorico = [...mensagens, { role: "user" as const, content: texto.trim() }];
    setMensagens(novoHistorico);
    setTexto("");
    enviarTurno(novoHistorico);
  }

  function fechar() {
    if (aplicado) onAplicado();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={fechar}>
      <div
        className="flex h-[32rem] w-full max-w-sm flex-col rounded-xl border border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{titulo}</h3>
            <p className="text-[11px] text-gray-500">Conversando com {agenteNome}</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {mensagens.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-surface text-gray-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-surface px-3 py-2 text-xs text-gray-500">
                {agenteNome} está pensando...
              </div>
            </div>
          )}
          {aplicado && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                {aplicado.resumo}
              </div>
            </div>
          )}
          {erro && <p className="text-[11px] text-red-400">{erro}</p>}
          <div ref={fimRef} />
        </div>

        <div className="border-t border-border p-3">
          {aplicado ? (
            <button
              type="button"
              onClick={fechar}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
            >
              Fechar
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviar()}
                disabled={carregando}
                placeholder="Responda..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={enviar}
                disabled={carregando || !texto.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
