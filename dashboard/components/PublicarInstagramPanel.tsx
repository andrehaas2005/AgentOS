"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Send, CheckCircle2 } from "lucide-react";
import { enviarMidiaConteudo, publicarConteudo, urlPublica, type Conteudo } from "@/lib/api";

export function PublicarInstagramPanel({ conteudo }: { conteudo: Conteudo }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const publicacaoInstagram = conteudo.publicacoes.find((p) => p.rede === "instagram" && p.status === "publicado");
  const midiaUrl = conteudo.midiaUrls[0];

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    const resultado = await enviarMidiaConteudo(conteudo.id, arquivo);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível enviar a imagem.");
      return;
    }
    router.refresh();
  }

  async function publicar() {
    const confirmado = window.confirm(
      "Publicar este conteúdo de verdade no Instagram? Essa ação não pode ser desfeita.",
    );
    if (!confirmado) return;

    setPublicando(true);
    setErro(null);
    setSucesso(null);
    const resultado = await publicarConteudo(conteudo.id);
    setPublicando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível publicar.");
      return;
    }
    setSucesso("Publicado no Instagram com sucesso.");
    router.refresh();
  }

  if (publicacaoInstagram) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface to-black/40 px-4 text-center">
        {midiaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlPublica(midiaUrl)} alt="" className="mb-2 max-h-32 rounded-lg object-cover" />
        )}
        <CheckCircle2 size={24} className="text-emerald-400" />
        <p className="text-[11px] text-emerald-400">Publicado no Instagram</p>
        {publicacaoInstagram.externalPostId && (
          <p className="truncate text-[10px] text-gray-500">ID: {publicacaoInstagram.externalPostId}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface to-black/40 px-4 text-center">
      {midiaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlPublica(midiaUrl)} alt="" className="mb-2 max-h-32 rounded-lg object-cover" />
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg"
            className="hidden"
            onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-gray-300 hover:text-white disabled:opacity-50"
          >
            <Upload size={13} /> {enviando ? "Enviando..." : "Enviar imagem (JPEG)"}
          </button>
        </>
      )}

      {midiaUrl && (
        <button
          type="button"
          onClick={publicar}
          disabled={publicando}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Send size={13} /> {publicando ? "Publicando..." : "Publicar no Instagram"}
        </button>
      )}

      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
      {sucesso && <p className="text-[11px] text-emerald-400">{sucesso}</p>}
    </div>
  );
}
