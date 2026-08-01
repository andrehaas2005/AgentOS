"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  return (
    <aside className="w-full shrink-0 rounded-xl border border-border bg-panel p-4 lg:w-80">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Bell size={14} className="text-amber-400" />
        Aguardando Aprovação
        {itens.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            {itens.length}
          </span>
        )}
      </h2>
      {itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma postagem aguardando aprovação.</p>
      ) : (
        <ul className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
          {itens.map((item) => {
            const conteudo = item.conteudos[0];
            const assunto = item.briefing?.trim() || conteudo?.texto?.slice(0, 90) || "—";
            const ocupado = processando === item.id;
            return (
              <li key={item.id} className="rounded-lg bg-surface p-2.5">
                <Link
                  href={`/calendario?highlight=${item.id}`}
                  className="flex items-start gap-2 hover:opacity-80"
                >
                  <EmpresaAvatar nome={item.empresa.nome} logoUrl={item.empresa.logoUrl} size={20} />
                  <div className="min-w-0">
                    <p className="truncate text-xs text-gray-200">
                      {item.empresa.nome} · {formatarDataHoraBR(item.dataHora)}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-gray-500">{assunto}</p>
                  </div>
                </Link>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => rejeitar(item.id)}
                    disabled={ocupado}
                    className="rounded-md px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => conteudo && aprovar(item.id, conteudo.id)}
                    disabled={!conteudo || ocupado}
                    className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {ocupado ? "..." : "Aprovar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
