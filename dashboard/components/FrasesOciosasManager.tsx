"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AGENTES } from "@/lib/agentes";
import {
  atualizarFraseOciosa,
  criarFraseOciosa,
  excluirFraseOciosa,
  getFrasesOciosas,
  type FraseOciosa,
} from "@/lib/api";

function ChipsAgentes({
  selecionados,
  onChange,
}: {
  selecionados: string[];
  onChange: (proximo: string[]) => void;
}) {
  const todos = selecionados.length === 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded-full px-2 py-0.5 text-[11px] ${
          todos ? "bg-blue-600 text-white" : "bg-surface text-gray-400 hover:text-white"
        }`}
      >
        Todos
      </button>
      {AGENTES.map((agente) => {
        const ativo = selecionados.includes(agente.nome);
        return (
          <button
            key={agente.nome}
            type="button"
            onClick={() =>
              onChange(ativo ? selecionados.filter((n) => n !== agente.nome) : [...selecionados, agente.nome])
            }
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              ativo ? "bg-blue-600 text-white" : "bg-surface text-gray-400 hover:text-white"
            }`}
          >
            {agente.nome}
          </button>
        );
      })}
    </div>
  );
}

function LinhaFrase({ frase, onMudou }: { frase: FraseOciosa; onMudou: () => void }) {
  const [texto, setTexto] = useState(frase.texto);
  const [agentes, setAgentes] = useState(frase.agentes);
  const [excluindo, setExcluindo] = useState(false);

  async function salvarTexto() {
    if (texto.trim() === frase.texto) return;
    await atualizarFraseOciosa(frase.id, { texto: texto.trim() });
    onMudou();
  }

  async function mudarAgentes(proximo: string[]) {
    setAgentes(proximo);
    await atualizarFraseOciosa(frase.id, { agentes: proximo });
    onMudou();
  }

  async function excluir() {
    if (!window.confirm("Excluir esta frase?")) return;
    setExcluindo(true);
    await excluirFraseOciosa(frase.id);
    onMudou();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface p-3">
      <div className="flex items-start gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvarTexto}
          rows={1}
          className="flex-1 resize-none rounded-md border border-border bg-panel px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={excluir}
          disabled={excluindo}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <ChipsAgentes selecionados={agentes} onChange={mudarAgentes} />
    </div>
  );
}

export function FrasesOciosasManager() {
  const [frases, setFrases] = useState<FraseOciosa[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [novosAgentes, setNovosAgentes] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);

  async function buscar() {
    const dados = await getFrasesOciosas();
    setFrases(dados);
    setCarregado(true);
  }

  useEffect(() => {
    buscar();
  }, []);

  async function adicionar() {
    if (!novoTexto.trim()) return;
    setCriando(true);
    const resultado = await criarFraseOciosa(novoTexto.trim(), novosAgentes);
    setCriando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível criar a frase.");
      return;
    }
    setNovoTexto("");
    setNovosAgentes([]);
    buscar();
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="mb-1 text-sm font-semibold text-white">Frases de ociosidade</h2>
      <p className="mb-4 text-xs text-gray-500">
        O que os agentes falam quando estão parados na copa. Atribua a um ou mais agentes específicos, ou
        deixe em &quot;Todos&quot; pra qualquer um poder falar.
      </p>

      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <textarea
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder="Nova frase..."
          rows={2}
          className="resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex items-center justify-between gap-2">
          <ChipsAgentes selecionados={novosAgentes} onChange={setNovosAgentes} />
          <button
            type="button"
            onClick={adicionar}
            disabled={criando || !novoTexto.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {carregado && frases.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma frase cadastrada ainda.</p>
      )}

      <div className="flex flex-col gap-2">
        {frases.map((frase) => (
          <LinhaFrase key={frase.id} frase={frase} onMudou={buscar} />
        ))}
      </div>
    </div>
  );
}
