"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Pencil, RotateCcw, Sparkles } from "lucide-react";
import {
  atualizarSkillAgente,
  getAgentesDefinicoes,
  restaurarSkillAgente,
  sugerirMelhoriaSkill,
  type AgenteDefinicao,
} from "@/lib/api";

function LinhaSkill({ definicao, onMudou }: { definicao: AgenteDefinicao; onMudou: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [descricao, setDescricao] = useState(definicao.descricao);
  const [prompt, setPrompt] = useState(definicao.prompt ?? "");
  const [salvando, setSalvando] = useState(false);
  const [pedidoSugestao, setPedidoSugestao] = useState("");
  const [gerandoSugestao, setGerandoSugestao] = useState(false);
  const [sugestao, setSugestao] = useState<{ promptSugerido: string; explicacao: string } | null>(null);

  const editavel = Boolean(definicao.chave);

  function iniciarEdicao() {
    setDescricao(definicao.descricao);
    setPrompt(definicao.prompt ?? "");
    setSugestao(null);
    setEditando(true);
    setAberto(true);
  }

  async function salvar() {
    if (!definicao.chave) return;
    setSalvando(true);
    const resultado = await atualizarSkillAgente(definicao.chave, { descricao: descricao.trim(), prompt: prompt.trim() });
    setSalvando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    onMudou();
  }

  async function restaurar() {
    if (!definicao.chave) return;
    if (!window.confirm("Restaurar o prompt padrão original desse agente? Suas edições serão perdidas.")) return;
    setSalvando(true);
    const resultado = await restaurarSkillAgente(definicao.chave);
    setSalvando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível restaurar.");
      return;
    }
    setEditando(false);
    onMudou();
  }

  async function pedirSugestao() {
    if (!definicao.chave) return;
    setGerandoSugestao(true);
    const resultado = await sugerirMelhoriaSkill(definicao.chave, pedidoSugestao.trim() || undefined);
    setGerandoSugestao(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível gerar uma sugestão.");
      return;
    }
    setSugestao({ promptSugerido: resultado.promptSugerido ?? "", explicacao: resultado.explicacao ?? "" });
  }

  function usarSugestao() {
    if (!sugestao) return;
    setPrompt(sugestao.promptSugerido);
    setSugestao(null);
  }

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
        <div className="flex shrink-0 items-center gap-2">
          {editavel && !editando && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                iniciarEdicao();
              }}
              className="rounded p-1 text-gray-500 hover:bg-panel hover:text-white"
              title="Editar"
            >
              <Pencil size={13} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-500 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {aberto && (
        <div className="border-t border-border px-3 py-2.5">
          {!editavel ? (
            <p className="text-xs text-gray-500">{definicao.descricao}</p>
          ) : editando ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">Descrição</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full rounded-md border border-border bg-panel px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={10}
                  className="w-full resize-y rounded-md border border-border bg-panel px-2 py-1.5 font-sans text-xs leading-relaxed text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-md border border-dashed border-border p-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-300">
                  <Sparkles size={13} className="text-violet-400" /> Pedir sugestão à IA
                </div>
                <div className="flex gap-2">
                  <input
                    value={pedidoSugestao}
                    onChange={(e) => setPedidoSugestao(e.target.value)}
                    placeholder="Ex: deixe as instruções mais diretas (opcional)"
                    className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={pedirSugestao}
                    disabled={gerandoSugestao}
                    className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {gerandoSugestao ? "Pensando..." : "Sugerir"}
                  </button>
                </div>
                {sugestao && (
                  <div className="mt-2 rounded-md bg-panel p-2">
                    <p className="mb-1.5 text-[11px] text-gray-400">{sugestao.explicacao}</p>
                    <pre className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-gray-300">
                      {sugestao.promptSugerido}
                    </pre>
                    <button
                      type="button"
                      onClick={usarSugestao}
                      className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-gray-200 hover:bg-border"
                    >
                      Usar esta sugestão
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={restaurar}
                  disabled={salvando}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 disabled:opacity-50"
                >
                  <RotateCcw size={12} /> Restaurar padrão
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvar}
                    disabled={salvando || !descricao.trim() || !prompt.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-300">
              {definicao.prompt}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function SkillsAgentes() {
  const [definicoes, setDefinicoes] = useState<AgenteDefinicao[]>([]);

  async function buscar() {
    const dados = await getAgentesDefinicoes();
    setDefinicoes(dados);
  }

  useEffect(() => {
    buscar();
  }, []);

  if (definicoes.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Skills dos agentes</h2>
      <p className="mb-4 text-xs text-gray-500">
        O prompt/instrução que cada agente segue. Clique num agente pra ver o texto completo, ou no lápis
        pra editar.
      </p>
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {definicoes.map((definicao) => (
          <LinhaSkill key={definicao.nome} definicao={definicao} onMudou={buscar} />
        ))}
      </div>
    </div>
  );
}
