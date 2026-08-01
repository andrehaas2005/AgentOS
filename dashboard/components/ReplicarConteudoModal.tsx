"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { replicarConteudo, type Conteudo, type Empresa } from "@/lib/api";

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReplicarConteudoModal({
  conteudo,
  empresas,
  onClose,
}: {
  conteudo: Conteudo;
  empresas: Empresa[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [data, setData] = useState(hoje());
  const [horario, setHorario] = useState("09:00");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ empresaId: string } | null>(null);

  const empresaEscolhida = empresas.find((e) => e.id === (sucesso?.empresaId ?? empresaId));

  async function salvar() {
    if (!empresaId) {
      setErro("Escolha uma empresa.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const resultado = await replicarConteudo(conteudo.id, {
      empresaId,
      dataHora: new Date(`${data}T${horario}`).toISOString(),
    });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível replicar o conteúdo.");
      return;
    }
    setSucesso({ empresaId });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Replicar conteúdo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {sucesso ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-300">
              Cópia criada em <span className="text-white">{empresaEscolhida?.nome}</span>, pronta pra editar.
            </p>
            <Link
              href={`/conteudos?empresaId=${sucesso.empresaId}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-500"
            >
              Ver cópia em {empresaEscolhida?.nome}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-500">
              Cria uma cópia editável e não publicada deste conteúdo (texto, mídia e tipo) em outra empresa.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Empresa de destino
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
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
                  Horário
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
                {salvando ? "Replicando..." : "Replicar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
