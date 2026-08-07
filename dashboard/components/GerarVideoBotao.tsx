"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { gerarVideoInicialConteudo } from "@/lib/api";

// Aparece só quando o conteúdo é do tipo vídeo e ainda não tem mídia (só o roteiro do
// Diretor de Vídeo salvo) — gera o vídeo de verdade via Pixverse a partir desse roteiro.
// Pode demorar alguns minutos (geração de vídeo é bem mais lenta que imagem).
export function GerarVideoBotao({ conteudoId }: { conteudoId: string }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setGerando(true);
    setErro(null);
    const resultado = await gerarVideoInicialConteudo(conteudoId);
    setGerando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível gerar o vídeo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={gerar}
        disabled={gerando}
        className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-600/30 disabled:opacity-50"
      >
        <Clapperboard size={13} /> {gerando ? "Gerando vídeo (pode levar alguns minutos)..." : "Gerar vídeo com IA"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
