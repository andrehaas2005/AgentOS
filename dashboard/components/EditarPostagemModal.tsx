"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { atualizarCalendarioItem, type CalendarioItem } from "@/lib/api";

const TIPOS_POST = [
  { value: "imagem_frase", label: "Imagem com frase" },
  { value: "carrossel", label: "Carrossel" },
  { value: "animacao", label: "Animação" },
  { value: "video_curto", label: "Vídeo curto" },
  { value: "stories", label: "Stories" },
  { value: "reels", label: "Reels" },
  { value: "post", label: "Post (texto)" },
];

function paraCamposLocais(iso: string): { data: string; horario: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    horario: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function EditarPostagemModal({ item, onClose }: { item: CalendarioItem; onClose: () => void }) {
  const router = useRouter();
  const iniciais = paraCamposLocais(item.dataHora);
  const [tipoPost, setTipoPost] = useState(item.tipoPost);
  const [briefing, setBriefing] = useState(item.briefing ?? "");
  const [data, setData] = useState(iniciais.data);
  const [horario, setHorario] = useState(iniciais.horario);
  const [aprovacaoAutomatica, setAprovacaoAutomatica] = useState(item.aprovacaoAutomatica);
  const [redesAlvo, setRedesAlvo] = useState<Set<string>>(new Set(item.redesAlvo));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const redesConectadas = item.empresa.contasSociais.filter(
    (c) => c.status === "conectado" && (c.rede === "instagram" || c.rede === "linkedin"),
  );

  function alternarRede(rede: string) {
    setRedesAlvo((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(rede)) proximo.delete(rede);
      else proximo.add(rede);
      return proximo;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const dataHora = new Date(`${data}T${horario}`).toISOString();
    const resultado = await atualizarCalendarioItem(item.id, {
      dataHora,
      tipoPost,
      briefing: briefing.trim() || undefined,
      aprovacaoAutomatica,
      redesAlvo: Array.from(redesAlvo),
    });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Erro ao salvar.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Editar postagem — {item.empresa.nome}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tipo de postagem
            <select
              value={tipoPost}
              onChange={(e) => setTipoPost(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {TIPOS_POST.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {redesConectadas.length > 1 && (
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Rede de publicação
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRedesAlvo(new Set())}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    redesAlvo.size === 0 ? "bg-blue-600 text-white" : "bg-surface text-gray-400 hover:text-white"
                  }`}
                >
                  Todas
                </button>
                {redesConectadas.map((c) => (
                  <button
                    key={c.rede}
                    type="button"
                    onClick={() => alternarRede(c.rede)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      redesAlvo.has(c.rede) ? "bg-blue-600 text-white" : "bg-surface text-gray-400 hover:text-white"
                    }`}
                  >
                    {c.rede}
                  </button>
                ))}
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Assunto / briefing
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={3}
              className="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Aprovação
            <div className="flex gap-2 rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setAprovacaoAutomatica(false)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                  !aprovacaoAutomatica ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setAprovacaoAutomatica(true)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                  aprovacaoAutomatica ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Automática
              </button>
            </div>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-400">
              Data
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-400">
              Horário (Brasília)
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
          </div>
        </div>

        {erro && <p className="mt-3 text-xs text-red-400">{erro}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-surface hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
