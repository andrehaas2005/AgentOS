"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { EmpresaAvatar } from "./EmpresaAvatar";
import type { Publicacao } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  publicado: "Publicado",
  erro: "Erro",
};

export function PublicacaoLinha({ publicacao }: { publicacao: Publicacao }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <tr
        onClick={() => setAberto(true)}
        className="cursor-pointer border-t border-border bg-surface hover:bg-panel"
      >
        <td className="px-4 py-3 whitespace-nowrap">
          {new Date(publicacao.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <EmpresaAvatar
              nome={publicacao.conteudo.calendario.empresa.nome}
              logoUrl={publicacao.conteudo.calendario.empresa.logoUrl}
              size={20}
            />
            {publicacao.conteudo.calendario.empresa.nome}
          </div>
        </td>
        <td className="px-4 py-3">{publicacao.rede}</td>
        <td className="px-4 py-3">{STATUS_LABEL[publicacao.status] ?? publicacao.status}</td>
        <td className="px-4 py-3 text-gray-500">{publicacao.externalPostId ?? "—"}</td>
        <td className="max-w-xs truncate px-4 py-3 text-gray-500" title={publicacao.log ?? undefined}>
          {publicacao.log ?? "—"}
        </td>
      </tr>

      {aberto && (
        <tr>
          <td colSpan={6} className="p-0">
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setAberto(false)}
            >
              <div
                className="w-full max-w-md rounded-xl border border-border bg-panel p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EmpresaAvatar
                      nome={publicacao.conteudo.calendario.empresa.nome}
                      logoUrl={publicacao.conteudo.calendario.empresa.logoUrl}
                      size={28}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {publicacao.conteudo.calendario.empresa.nome}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(publicacao.createdAt).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">Rede</dt>
                    <dd className="text-gray-200">{publicacao.rede}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">Status</dt>
                    <dd className="text-gray-200">{STATUS_LABEL[publicacao.status] ?? publicacao.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">Tipo de post / assunto</dt>
                    <dd className="text-gray-200">
                      {publicacao.conteudo.calendario.tipoPost}
                      {publicacao.conteudo.calendario.briefing ? ` — ${publicacao.conteudo.calendario.briefing}` : ""}
                    </dd>
                  </div>
                  {publicacao.conteudo.texto && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-gray-500">Texto publicado</dt>
                      <dd className="max-h-40 overflow-y-auto whitespace-pre-wrap text-gray-300">
                        {publicacao.conteudo.texto}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">Aprovado por</dt>
                    <dd className="text-gray-200">
                      {publicacao.conteudo.aprovadoPor ?? "—"}
                      {publicacao.conteudo.aprovadoEm &&
                        ` em ${new Date(publicacao.conteudo.aprovadoEm).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}`}
                    </dd>
                  </div>
                  {publicacao.link && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-gray-500">Link</dt>
                      <dd>
                        <a
                          href={publicacao.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                        >
                          {publicacao.link} <ExternalLink size={12} />
                        </a>
                      </dd>
                    </div>
                  )}
                  {publicacao.log && (
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-gray-500">Log</dt>
                      <dd className="text-gray-300">{publicacao.log}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
