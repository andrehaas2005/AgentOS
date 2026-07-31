"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, ExternalLink } from "lucide-react";
import { publicarConteudo, type Conteudo } from "@/lib/api";

export function PublicarInstagramPanel({ conteudo }: { conteudo: Conteudo }) {
  const router = useRouter();
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const publicacaoInstagram = conteudo.publicacoes.find((p) => p.rede === "instagram" && p.status === "publicado");
  const midiaUrl = conteudo.midiaUrls[0];

  async function publicar() {
    const confirmado = window.confirm(
      "Publicar este conteúdo de verdade no Instagram? Essa ação não pode ser desfeita.",
    );
    if (!confirmado) return;

    setPublicando(true);
    setErro(null);
    const resultado = await publicarConteudo(conteudo.id);
    setPublicando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível publicar.");
      return;
    }
    router.refresh();
  }

  if (publicacaoInstagram) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
        <CheckCircle2 size={14} />
        <span>Publicado no Instagram</span>
        {publicacaoInstagram.link && (
          <a
            href={publicacaoInstagram.link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 text-gray-400 hover:text-white"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    );
  }

  if (!conteudo.aprovadoPor) return null;
  if (!midiaUrl) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={publicar}
        disabled={publicando}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        <Send size={13} /> {publicando ? "Publicando..." : "Publicar no Instagram"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
