"use client";

import { X, ExternalLink } from "lucide-react";
import { EmpresaAvatar } from "./EmpresaAvatar";
import type { CalendarioItem } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicando: "Publicando",
  publicado: "Publicado",
  erro: "Erro",
};

const STATUS_PUBLICACAO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  publicado: "Publicado",
  erro: "Erro",
};

function formatarDataHoraBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function HistoricoAgendamentoModal({
  item,
  onClose,
}: {
  item: CalendarioItem;
  onClose: () => void;
}) {
  const conteudo = item.conteudos?.[0];
  const historico = [...(conteudo?.publicacoes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <EmpresaAvatar nome={item.empresa.nome} logoUrl={item.empresa.logoUrl} size={28} />
            <div>
              <p className="text-sm font-medium text-white">{item.empresa.nome}</p>
              <p className="text-[11px] text-gray-500">{formatarDataHoraBR(item.dataHora)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Status atual</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-gray-200">
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>

        {item.briefing && (
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Briefing</p>
            <p className="text-sm text-gray-300">{item.briefing}</p>
          </div>
        )}

        {item.status === "erro" && item.ultimoErro && (
          <div className="mb-4">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
              Erro na geração do conteúdo
            </p>
            <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 text-[11px] leading-relaxed text-red-300">
              {item.ultimoErro}
            </pre>
          </div>
        )}

        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Histórico de publicação
        </h4>

        {historico.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma tentativa de publicação registrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {historico.map((pub) => (
              <li key={pub.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-panel px-1.5 py-0.5 text-[11px] font-medium capitalize text-gray-300">
                      {pub.rede}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        pub.status === "erro"
                          ? "bg-red-500/15 text-red-400"
                          : pub.status === "publicado"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-gray-500/15 text-gray-300"
                      }`}
                    >
                      {STATUS_PUBLICACAO_LABEL[pub.status] ?? pub.status}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-500">
                    {formatarDataHoraBR(pub.createdAt)}
                  </span>
                </div>

                {pub.link && (
                  <a
                    href={pub.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-1 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Ver post <ExternalLink size={11} />
                  </a>
                )}
                {pub.externalPostId && !pub.link && (
                  <p className="mb-1 text-xs text-gray-500">ID externo: {pub.externalPostId}</p>
                )}

                {pub.status === "erro" && pub.log && (
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Erro completo</p>
                    <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 text-[11px] leading-relaxed text-red-300">
                      {pub.log}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
