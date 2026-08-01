"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { dispararRevisao, type Conteudo } from "@/lib/api";

export function RevisaoBotao({ conteudo }: { conteudo: Conteudo }) {
  const router = useRouter();
  const [revisando, setRevisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function revisar() {
    setRevisando(true);
    setErro(null);
    const resultado = await dispararRevisao(conteudo.id);
    setRevisando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível rodar a revisão.");
      return;
    }
    router.refresh();
  }

  const ultimaRevisao = conteudo.metadata?.ultimaRevisao;
  const desatualizada = ultimaRevisao && ultimaRevisao.versaoRevisada !== conteudo.versao;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={revisar}
        disabled={revisando}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-gray-300 hover:text-white disabled:opacity-50"
      >
        <ShieldCheck size={13} /> {revisando ? "Revisando..." : "Passar por revisão"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
      {ultimaRevisao && (
        <div className="flex flex-col gap-0.5">
          <span
            className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
              ultimaRevisao.aprovado ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {ultimaRevisao.aprovado ? "Aprovado pelo Revisor" : "Reprovado pelo Revisor — ver observações"}
          </span>
          <p className="text-[11px] text-gray-500">{ultimaRevisao.observacoes}</p>
          {desatualizada && (
            <span className="w-fit rounded-full bg-surface px-2 py-0.5 text-[10px] text-gray-500">
              revisão desatualizada (v{ultimaRevisao.versaoRevisada}, atual v{conteudo.versao})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
