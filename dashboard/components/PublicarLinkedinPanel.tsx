"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Linkedin } from "lucide-react";
import { publicarConteudoLinkedin, type Conteudo } from "@/lib/api";

export function PublicarLinkedinPanel({ conteudo }: { conteudo: Conteudo }) {
  const router = useRouter();
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const publicacaoLinkedin = conteudo.publicacoes.find((p) => p.rede === "linkedin" && p.status === "publicado");

  async function publicar() {
    const confirmado = window.confirm("Publicar este conteúdo de verdade no LinkedIn? Essa ação não pode ser desfeita.");
    if (!confirmado) return;

    setPublicando(true);
    setErro(null);
    setSucesso(null);
    const resultado = await publicarConteudoLinkedin(conteudo.id);
    setPublicando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível publicar.");
      return;
    }
    setSucesso("Publicado no LinkedIn com sucesso.");
    router.refresh();
  }

  if (publicacaoLinkedin) {
    return (
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-emerald-400">
        <CheckCircle2 size={14} />
        <span>Publicado no LinkedIn</span>
        {publicacaoLinkedin.externalPostId && (
          <span className="truncate text-gray-500">· {publicacaoLinkedin.externalPostId}</span>
        )}
      </div>
    );
  }

  if (!conteudo.texto || !conteudo.texto.trim()) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
      <button
        type="button"
        onClick={publicar}
        disabled={publicando}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a66c2]/80 disabled:opacity-50"
      >
        <Linkedin size={13} />
        <Send size={13} /> {publicando ? "Publicando..." : "Publicar no LinkedIn"}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
      {sucesso && <p className="text-[11px] text-emerald-400">{sucesso}</p>}
    </div>
  );
}
