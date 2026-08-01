"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trash2, Plus } from "lucide-react";
import {
  atualizarAgenteCustomizado,
  criarAgenteCustomizado,
  excluirAgenteCustomizado,
  gerarRascunhoAgente,
  getAgentesCustomizados,
  type AgenteCustomizado,
} from "@/lib/api";

function LinhaAgente({ agente, onMudou }: { agente: AgenteCustomizado; onMudou: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function alternarAtivo() {
    await atualizarAgenteCustomizado(agente.id, { ativo: !agente.ativo });
    onMudou();
  }

  async function excluir() {
    if (!window.confirm(`Excluir o agente "${agente.nome}"?`)) return;
    setExcluindo(true);
    await excluirAgenteCustomizado(agente.id);
    onMudou();
  }

  return (
    <div className="rounded-lg bg-surface">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <button type="button" onClick={() => setAberto((a) => !a)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-white">
            {agente.nome} {agente.origem === "ceo" && <span className="text-xs text-blue-400">(via CEO)</span>}
          </p>
          <p className="truncate text-xs text-gray-500">{agente.descricao}</p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={alternarAtivo}
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              agente.ativo ? "bg-emerald-500/15 text-emerald-300" : "bg-surface text-gray-500"
            }`}
          >
            {agente.ativo ? "Ativo" : "Inativo"}
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            className="rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {aberto && (
        <div className="border-t border-border px-3 py-2.5">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-300">{agente.prompt}</pre>
        </div>
      )}
    </div>
  );
}

export function AgentesCustomizadosManager() {
  const [agentes, setAgentes] = useState<AgenteCustomizado[]>([]);
  const [criando, setCriando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [pedido, setPedido] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prompt, setPrompt] = useState("");

  async function buscar() {
    setAgentes(await getAgentesCustomizados());
  }

  useEffect(() => {
    buscar();
  }, []);

  async function pedirParaCeo() {
    if (!pedido.trim()) return;
    setGerando(true);
    const resultado = await gerarRascunhoAgente(pedido.trim());
    setGerando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível gerar o agente.");
      return;
    }
    setNome(resultado.nome ?? "");
    setDescricao(resultado.descricao ?? "");
    setPrompt(resultado.prompt ?? "");
  }

  async function salvar() {
    if (!nome.trim() || !descricao.trim() || !prompt.trim()) return;
    setCriando(true);
    const resultado = await criarAgenteCustomizado({ nome: nome.trim(), descricao: descricao.trim(), prompt: prompt.trim() });
    setCriando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível criar o agente.");
      return;
    }
    setNome("");
    setDescricao("");
    setPrompt("");
    setPedido("");
    buscar();
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Agentes customizados</h2>
      <p className="mb-4 text-xs text-gray-500">
        Rodam de verdade depois do time fixo, com o conteúdo final já pronto, e contribuem com uma nota
        conforme a função deles. Crie manualmente ou peça pro CEO gerar um rascunho pra você revisar.
      </p>

      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <div className="flex items-center gap-2">
          <input
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Descreva o que o novo agente deve fazer (ex: sugerir hashtags de tendência)"
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={pedirParaCeo}
            disabled={gerando || !pedido.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Sparkles size={13} /> {gerando ? "Gerando..." : "Pedir pro CEO"}
          </button>
        </div>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do agente"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição curta da função"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt completo que o agente vai seguir"
          rows={4}
          className="resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={criando || !nome.trim() || !descricao.trim() || !prompt.trim()}
          className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Plus size={13} /> Criar agente
        </button>
      </div>

      {agentes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum agente customizado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {agentes.map((agente) => (
            <LinhaAgente key={agente.id} agente={agente} onMudou={buscar} />
          ))}
        </div>
      )}
    </div>
  );
}
