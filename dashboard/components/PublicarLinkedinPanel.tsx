"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Linkedin, ExternalLink } from "lucide-react";
import { publicarConteudoLinkedin, type Conteudo } from "@/lib/api";

export function PublicarLinkedinPanel({ conteudo }: { conteudo: Conteudo }) {
  const router = useRouter();
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const publicacaoLinkedin = conteudo.publicacoes.find((p) => p.rede === "linkedin" && p.status === "publicado");

  async function publicar() {
    const confirmado = window.confirm("Publicar este conteúdo de verdade no LinkedIn? Essa ação não pode ser desfeita.");
    if (!confirmado) return;

    setPublicando(true);
    setErro(null);
    const resultado = await publicarConteudoLinkedin(conteudo.id);
    setPublicando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível publicar.");
      return;
    }
    router.refresh();
  }

  if (publicacaoLinkedin) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
        <CheckCircle2 size={14} />
        <span>Publicado no LinkedIn</span>
        {publicacaoLinkedin.link && (
          <a
            href={publicacaoLinkedin.link}
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

  if (!conteudo.texto || !conteudo.texto.trim()) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={publicar}
        disabled={publicando}
        className="flex items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a66c2]/80 disabled:opacity-50"
      >
        <Linkedin size={13} />
        <Send size={13} /> {publicando ? "Publicando..." : "Publicar no LinkedIn"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
