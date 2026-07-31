"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { enviarMidiaConteudo } from "@/lib/api";

export function EnviarMidiaControle({ conteudoId }: { conteudoId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    const resultado = await enviarMidiaConteudo(conteudoId, arquivo);
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível enviar a imagem.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
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
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
