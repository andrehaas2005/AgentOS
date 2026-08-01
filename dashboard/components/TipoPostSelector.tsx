"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { atualizarTipoConteudo } from "@/lib/api";
import { TIPOS_POST } from "@/lib/tiposPost";

export function TipoPostSelector({ conteudoId, tipoPost }: { conteudoId: string; tipoPost: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function trocar(valor: string) {
    if (valor === tipoPost) return;
    setSalvando(true);
    const resultado = await atualizarTipoConteudo(conteudoId, valor);
    setSalvando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível trocar o tipo de post.");
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={tipoPost}
      onChange={(e) => trocar(e.target.value)}
      disabled={salvando}
      className="shrink-0 rounded-full border-none bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300 outline-none disabled:opacity-50"
    >
      {TIPOS_POST.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
