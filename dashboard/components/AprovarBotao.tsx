"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { aprovarConteudo } from "@/lib/api";

export function AprovarBotao({ conteudoId }: { conteudoId: string }) {
  const router = useRouter();
  const [aprovando, setAprovando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aprovar() {
    const confirmado = window.confirm(
      "Aprovar este conteúdo? Ele será publicado agora em todas as redes conectadas dessa empresa.",
    );
    if (!confirmado) return;

    setAprovando(true);
    setErro(null);
    const resultado = await aprovarConteudo(conteudoId, "André Haas");
    setAprovando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível aprovar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={aprovar}
        disabled={aprovando}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <CheckCheck size={13} /> {aprovando ? "Aprovando..." : "Aprovar"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
