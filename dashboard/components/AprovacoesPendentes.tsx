"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EmpresaAvatar } from "./EmpresaAvatar";
import {
  aprovarConteudo,
  excluirCalendarioItem,
  getAguardandoAprovacao,
  type ItemAguardandoAprovacao,
} from "@/lib/api";

function formatarDataHoraBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AprovacoesPendentes({ empresaId }: { empresaId?: string }) {
  const router = useRouter();
  const [itens, setItens] = useState<ItemAguardandoAprovacao[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      const dados = await getAguardandoAprovacao(empresaId);
      if (!cancelado) setItens(dados);
    }
    buscar();
    const id = setInterval(buscar, 30000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [empresaId]);

  async function aprovar(itemId: string, conteudoId: string) {
    setProcessando(itemId);
    const resultado = await aprovarConteudo(conteudoId, "André Haas");
    setProcessando(null);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível aprovar.");
      return;
    }
    setItens((prev) => prev.filter((i) => i.id !== itemId));
    router.refresh();
  }

  async function rejeitar(itemId: string) {
    if (!window.confirm("Rejeitar e excluir esta postagem?")) return;
    setProcessando(itemId);
    const resultado = await excluirCalendarioItem(itemId);
    setProcessando(null);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível rejeitar.");
      return;
    }
    setItens((prev) => prev.filter((i) => i.id !== itemId));
    router.refresh();
  }

  if (itens.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
        <Bell size={16} />
        {itens.length} {itens.length > 1 ? "postagens" : "postagem"} aguardando sua aprovação
      </h2>
      <div className="flex flex-col gap-2">
        {itens.map((item) => {
          const conteudo = item.conteudos[0];
          const assunto = item.briefing?.trim() || conteudo?.texto?.slice(0, 90) || "—";
          const ocupado = processando === item.id;
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <EmpresaAvatar nome={item.empresa.nome} logoUrl={item.empresa.logoUrl} size={22} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {item.empresa.nome} · {formatarDataHoraBR(item.dataHora)}
                  </p>
                  <p className="max-w-md truncate text-xs text-gray-400">{assunto}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => rejeitar(item.id)}
                  disabled={ocupado}
                  className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => conteudo && aprovar(item.id, conteudo.id)}
                  disabled={!conteudo || ocupado}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {ocupado ? "Processando..." : "Aprovar e publicar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
