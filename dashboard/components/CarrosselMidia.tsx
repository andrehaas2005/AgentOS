"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2, Sparkles } from "lucide-react";
import { urlPublica, removerMidiaConteudo, regenerarMidiaConteudo, type ConteudoMetadata } from "@/lib/api";

function ehVideo(url: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(url);
}

function temPromptSalvo(metadata: ConteudoMetadata | null | undefined, indice: number): boolean {
  if (!metadata) return false;
  if (metadata.slidesEducativo?.[indice]?.promptFoto) return true;
  if (metadata.promptImagens?.[indice]) return true;
  if (indice === 0 && metadata.promptImagem) return true;
  return false;
}

export function CarrosselMidia({
  conteudoId,
  urls,
  metadata,
}: {
  conteudoId: string;
  urls: string[];
  metadata?: ConteudoMetadata | null;
}) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const total = urls.length;
  const urlAtual = urls[indice];
  const video = ehVideo(urlAtual);

  async function excluir() {
    if (!window.confirm("Remover esta mídia do post?")) return;
    setProcessando(true);
    setErro(null);
    const resultado = await removerMidiaConteudo(conteudoId, urlAtual);
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível remover a mídia.");
      return;
    }
    setIndice((i) => Math.max(0, Math.min(i, total - 2)));
    router.refresh();
  }

  async function regenerar() {
    setProcessando(true);
    setErro(null);
    const resultado = await regenerarMidiaConteudo(conteudoId, indice);
    setProcessando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível gerar a mídia novamente.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden bg-black/20">
        {video ? (
          <video controls className="h-full w-full object-cover" src={urlPublica(urlAtual)} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlPublica(urlAtual)} alt="" className="h-full w-full object-cover" />
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndice((i) => (i - 1 + total) % total)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIndice((i) => (i + 1) % total)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronRight size={16} />
            </button>
            <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
              {indice + 1}/{total}
            </span>
            <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
              {urls.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === indice ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute left-1.5 top-1.5 flex gap-1">
          <button
            type="button"
            onClick={excluir}
            disabled={processando}
            title="Remover esta mídia"
            className="rounded-full bg-black/50 p-1 text-white hover:bg-red-600/80 disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
          {!video && temPromptSalvo(metadata, indice) && (
            <button
              type="button"
              onClick={regenerar}
              disabled={processando}
              title="Gerar novamente com IA"
              className="rounded-full bg-black/50 p-1 text-white hover:bg-violet-600/80 disabled:opacity-50"
            >
              <Sparkles size={13} />
            </button>
          )}
        </div>
      </div>
      {processando && <p className="px-3 pt-1.5 text-[11px] text-gray-500">Processando...</p>}
      {erro && <p className="px-3 pt-1.5 text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
