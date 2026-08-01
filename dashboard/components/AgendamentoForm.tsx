"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { criarCalendarioItem, type Empresa } from "@/lib/api";
import { TIPOS_POST } from "@/lib/tiposPost";

type Props = {
  empresas: Empresa[];
  onClose: () => void;
};

const DIAS_SEMANA = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AgendamentoForm({ empresas, onClose }: Props) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [tipoPost, setTipoPost] = useState(TIPOS_POST[0].value);
  const [briefing, setBriefing] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [aprovacaoAutomatica, setAprovacaoAutomatica] = useState(false);
  const [redesAlvo, setRedesAlvo] = useState<Set<string>>(new Set());

  const empresaSelecionada = empresas.find((e) => e.id === empresaId);
  const redesConectadas = (empresaSelecionada?.contasSociais ?? []).filter(
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

  const [data, setData] = useState(hoje());
  const [horario, setHorario] = useState("09:00");

  const [diasSemana, setDiasSemana] = useState<Set<number>>(new Set());
  const [dataInicial, setDataInicial] = useState(hoje());
  const [dataFinal, setDataFinal] = useState(hoje());

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarDia(dia: number) {
    setDiasSemana((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(dia)) proximo.delete(dia);
      else proximo.add(dia);
      return proximo;
    });
  }

  function montarOcorrencias(): Date[] {
    if (!recorrente) {
      return [new Date(`${data}T${horario}`)];
    }

    const ocorrencias: Date[] = [];
    const [h, m] = horario.split(":").map(Number);
    const inicio = new Date(`${dataInicial}T00:00`);
    const fim = new Date(`${dataFinal}T00:00`);

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (diasSemana.has(d.getDay())) {
        const ocorrencia = new Date(d);
        ocorrencia.setHours(h, m, 0, 0);
        ocorrencias.push(ocorrencia);
      }
    }
    return ocorrencias;
  }

  async function salvar() {
    if (!empresaId) {
      setErro("Escolha uma empresa.");
      return;
    }
    if (recorrente && diasSemana.size === 0) {
      setErro("Marque pelo menos um dia da semana.");
      return;
    }

    const ocorrencias = montarOcorrencias();
    if (ocorrencias.length === 0) {
      setErro("Nenhuma data cai no período/dias escolhidos.");
      return;
    }

    setSalvando(true);
    setErro(null);

    for (const ocorrencia of ocorrencias) {
      const resultado = await criarCalendarioItem({
        empresaId,
        dataHora: ocorrencia.toISOString(),
        tipoPost,
        briefing: briefing.trim() || undefined,
        aprovacaoAutomatica,
        redesAlvo: redesAlvo.size > 0 ? Array.from(redesAlvo) : undefined,
      });
      if (!resultado.ok) {
        setSalvando(false);
        setErro(resultado.erro ?? "Erro ao salvar uma das postagens.");
        return;
      }
    }

    setSalvando(false);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Nova postagem</h3>
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
            Empresa
            <select
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value);
                setRedesAlvo(new Set());
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>

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
              placeholder="ex: dica prática sobre o nicho da empresa"
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
            <span className="text-[10px] text-gray-500">
              {aprovacaoAutomatica
                ? "Publica sozinho assim que o conteúdo fica pronto, sem revisão."
                : "Gera o conteúdo antes do horário e espera você aprovar pra publicar."}
            </span>
          </label>

          <div className="flex gap-2 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setRecorrente(false)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                !recorrente ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Não se repete
            </button>
            <button
              type="button"
              onClick={() => setRecorrente(true)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                recorrente ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Recorrente
            </button>
          </div>

          {!recorrente ? (
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
                Horário
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1 text-xs text-gray-400">
                Dias da semana
                <div className="flex gap-1">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => alternarDia(d.value)}
                      className={`h-7 w-7 rounded-full text-xs font-medium ${
                        diasSemana.has(d.value)
                          ? "bg-blue-600 text-white"
                          : "bg-surface text-gray-400 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-gray-400">
                  Data inicial
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={(e) => setDataInicial(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-gray-400">
                  Data final
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Horário
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
            </>
          )}
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
            {salvando ? "Salvando..." : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
